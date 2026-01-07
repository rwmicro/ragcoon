"use client"

import { createContext, useContext, useState, useEffect } from "react"

// Simple stub types for preferences
export type LayoutType = "sidebar" | "fullscreen"
export type NavigationPosition = "sidebar" | "header"

export type UserPreferences = {
  layout: LayoutType
  navigationPosition: NavigationPosition
  showConversationPreviews: boolean
  enableFileUploads: boolean
  enableSearchShortcut: boolean
  promptSuggestions: boolean
  showToolInvocations: boolean
  enableTTS: boolean
  enableSTT: boolean
}

type UserPreferencesContextType = {
  preferences: UserPreferences
  setLayout: (layout: LayoutType) => void
  setNavigationPosition: (position: NavigationPosition) => void
  setShowConversationPreviews: (show: boolean) => void
  setEnableFileUploads: (enabled: boolean) => void
  setEnableSearchShortcut: (enabled: boolean) => void
  setPromptSuggestions: (enabled: boolean) => void
  setShowToolInvocations: (enabled: boolean) => void
  setEnableTTS: (enabled: boolean) => void
  setEnableSTT: (enabled: boolean) => void
  isModelHidden: (modelId: string) => boolean
  toggleModelVisibility: (modelId: string) => void
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined)

// Default preferences
const defaultPreferences: UserPreferences = {
  layout: "sidebar",
  navigationPosition: "sidebar",
  showConversationPreviews: false,
  enableFileUploads: true,
  enableSearchShortcut: true,
  promptSuggestions: true,
  showToolInvocations: true,
  enableTTS: true,
  enableSTT: true,
}

// LocalStorage key
const PREFERENCES_STORAGE_KEY = "user-preferences"
const HIDDEN_MODELS_STORAGE_KEY = "hidden-models"

export function UserPreferencesProvider({
  children,
  userId,
  initialPreferences
}: {
  children: React.ReactNode
  userId?: string
  initialPreferences?: UserPreferences
}) {
  // Initialize state from localStorage or defaults
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window === "undefined") {
      return initialPreferences || defaultPreferences
    }

    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY)
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error("Failed to load preferences from localStorage:", error)
    }

    return initialPreferences || defaultPreferences
  })

  // Track hidden models
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(() => {
    if (typeof window === "undefined") {
      return new Set()
    }

    try {
      const stored = localStorage.getItem(HIDDEN_MODELS_STORAGE_KEY)
      if (stored) {
        return new Set(JSON.parse(stored))
      }
    } catch (error) {
      console.error("Failed to load hidden models from localStorage:", error)
    }

    return new Set()
  })

  // Persist preferences to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
      } catch (error) {
        console.error("Failed to save preferences to localStorage:", error)
      }
    }
  }, [preferences])

  // Persist hidden models to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(HIDDEN_MODELS_STORAGE_KEY, JSON.stringify(Array.from(hiddenModels)))
      } catch (error) {
        console.error("Failed to save hidden models to localStorage:", error)
      }
    }
  }, [hiddenModels])

  const setLayout = (layout: LayoutType) => {
    setPreferences((prev) => ({ ...prev, layout }))
  }

  const setNavigationPosition = (position: NavigationPosition) => {
    setPreferences((prev) => ({ ...prev, navigationPosition: position }))
  }

  const setShowConversationPreviews = (show: boolean) => {
    setPreferences((prev) => ({ ...prev, showConversationPreviews: show }))
  }

  const setEnableFileUploads = (enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, enableFileUploads: enabled }))
  }

  const setEnableSearchShortcut = (enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, enableSearchShortcut: enabled }))
  }

  const setPromptSuggestions = (enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, promptSuggestions: enabled }))
  }

  const setShowToolInvocations = (enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, showToolInvocations: enabled }))
  }

  const setEnableTTS = (enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, enableTTS: enabled }))
  }

  const setEnableSTT = (enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, enableSTT: enabled }))
  }

  const isModelHidden = (modelId: string) => {
    return hiddenModels.has(modelId)
  }

  const toggleModelVisibility = (modelId: string) => {
    setHiddenModels((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(modelId)) {
        newSet.delete(modelId)
      } else {
        newSet.add(modelId)
      }
      return newSet
    })
  }

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        setLayout,
        setNavigationPosition,
        setShowConversationPreviews,
        setEnableFileUploads,
        setEnableSearchShortcut,
        setPromptSuggestions,
        setShowToolInvocations,
        setEnableTTS,
        setEnableSTT,
        isModelHidden,
        toggleModelVisibility,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  )
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext)
  if (context === undefined) {
    throw new Error("useUserPreferences must be used within a UserPreferencesProvider")
  }
  return context
}