"use client"

import { fetchClient } from "@/lib/fetch"
import { SKIP_API_KEY_CHECK } from "@/lib/config"
import { ModelConfig } from "@/lib/models/types"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"

type UserKeyStatus = {
  openrouter: boolean
  openai: boolean
  mistral: boolean
  google: boolean
  perplexity: boolean
  xai: boolean
  anthropic: boolean
  [key: string]: boolean // Allow for additional providers
}

type ModelContextType = {
  models: ModelConfig[]
  userKeyStatus: UserKeyStatus
  isLoading: boolean
  refreshModels: () => Promise<void>
  refreshUserKeyStatus: () => Promise<void>
  refreshAll: () => Promise<void>
}

const ModelContext = createContext<ModelContextType | undefined>(undefined)

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [models, setModels] = useState<ModelConfig[]>([])
  const [userKeyStatus, setUserKeyStatus] = useState<UserKeyStatus>({
    openrouter: false,
    openai: false,
    mistral: false,
    google: false,
    perplexity: false,
    xai: false,
    anthropic: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const fetchModels = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetchClient("/api/models", {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        setModels(data.models || [])
      } else {
        console.warn("Failed to fetch models, status:", response.status)
        setModels([]) // Set empty array to prevent undefined errors
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error("Model fetch timeout - server may be overloaded")
      } else {
        console.error("Failed to fetch models:", error)
      }
      setModels([]) // Always set models to prevent undefined
    }
  }, [])

  const fetchUserKeyStatus = useCallback(async () => {
    if (SKIP_API_KEY_CHECK) {
      // Skip API key status check for Ollama-only setup
      console.log('Skipping API key status check - using local models only')
      setUserKeyStatus({
        openrouter: false,
        openai: false,
        mistral: false,
        google: false,
        perplexity: false,
        xai: false,
        anthropic: false,
      })
      return
    }

    try {
      const response = await fetchClient("/api/user-key-status")
      if (response.ok) {
        const data = await response.json()
        setUserKeyStatus(data)
      }
    } catch (error) {
      console.error("Failed to fetch user key status:", error)
      // Set default values on error
      setUserKeyStatus({
        openrouter: false,
        openai: false,
        mistral: false,
        google: false,
        perplexity: false,
        xai: false,
        anthropic: false,
      })
    }
  }, [])


  const refreshModels = useCallback(async () => {
    setIsLoading(true)
    try {
      // Force refresh the backend models cache first
      await fetchClient("/api/models/refresh", {
        method: "POST"
      })
      // Then fetch the updated models
      await fetchModels()
    } catch (error) {
      console.error("Failed to refresh models:", error)
      // Still try to fetch models even if refresh endpoint fails
      await fetchModels()
    } finally {
      setIsLoading(false)
    }
  }, [fetchModels])

  const refreshUserKeyStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      await fetchUserKeyStatus()
    } finally {
      setIsLoading(false)
    }
  }, [fetchUserKeyStatus])


  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    try {
      if (SKIP_API_KEY_CHECK) {
        // Only fetch models for Ollama-only setup
        await fetchModels()
        // Set user key status without API call
        fetchUserKeyStatus()
      } else {
        // Full refresh including API key status
        await Promise.all([
          fetchModels(),
          fetchUserKeyStatus(),
        ])
      }
    } finally {
      setIsLoading(false)
    }
  }, [fetchModels, fetchUserKeyStatus])

  // Initial data fetch with cleanup - optimized for faster startup
  useEffect(() => {
    let mounted = true

    async function initializeModels() {
      if (!mounted) return

      try {
        // Force refresh the backend models cache first to discover Ollama models
        try {
          await fetchClient("/api/models/refresh", {
            method: "POST"
          })
        } catch (refreshError) {
          console.warn('Initial model refresh failed, continuing with fetch:', refreshError)
        }

        // Fetch models first (critical for app to work)
        await fetchModels()
        setIsLoading(false) // Mark as loaded after models are fetched

        // Fetch API key status in background (non-critical)
        if (!SKIP_API_KEY_CHECK) {
          startTransition(() => {
            fetchUserKeyStatus().catch(error => {
              console.error('Failed to fetch user key status:', error)
            })
          })
        } else {
          fetchUserKeyStatus()
        }
      } catch (error) {
        console.error('Failed to initialize models:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeModels()

    return () => {
      mounted = false
    }
  }, []) // Empty deps - only run once on mount

  // Listen for RAG model creation events
  const refreshModelsRef = useRef(refreshModels)

  // Keep ref up to date
  useEffect(() => {
    refreshModelsRef.current = refreshModels
  }, [refreshModels])

  useEffect(() => {
    const handleRagModelCreated = () => {
      console.log('RAG model created, refreshing models list...')
      refreshModelsRef.current()
    }

    window.addEventListener('rag-model-created', handleRagModelCreated)
    return () => {
      window.removeEventListener('rag-model-created', handleRagModelCreated)
    }
  }, []) // Empty deps - listener never recreated

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    models,
    userKeyStatus,
    isLoading,
    refreshModels,
    refreshUserKeyStatus,
    refreshAll,
  }), [models, userKeyStatus, isLoading, refreshModels, refreshUserKeyStatus, refreshAll])

  return (
    <ModelContext.Provider value={contextValue}>
      {children}
    </ModelContext.Provider>
  )
}

// Custom hook to use the model context
export function useModel() {
  const context = useContext(ModelContext)
  if (context === undefined) {
    throw new Error("useModel must be used within a ModelProvider")
  }
  return context
}
