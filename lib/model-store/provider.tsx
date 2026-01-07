"use client"

import { fetchClient } from "@/lib/fetch"
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
  isLoading: boolean
  refreshModels: () => Promise<void>
  refreshAll: () => Promise<void>
}

const ModelContext = createContext<ModelContextType | undefined>(undefined)

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [models, setModels] = useState<ModelConfig[]>([])

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


  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    try {
        await fetchModels()
    } finally {
      setIsLoading(false)
    }
  }, [fetchModels])

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
    isLoading,
    refreshModels,
    refreshAll,
  }), [models, isLoading, refreshModels, refreshAll])

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
