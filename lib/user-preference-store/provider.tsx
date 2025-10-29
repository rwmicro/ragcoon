"use client"

import { createContext, useContext } from "react"

// Simple stub types for preferences
export type LayoutType = "sidebar" | "fullscreen"

export type UserPreferences = {
  layout: LayoutType
  showConversationPreviews: boolean
  enableFileUploads: boolean
  enableSearchShortcut: boolean
  multiModelEnabled: boolean
  promptSuggestions: boolean
  showToolInvocations: boolean
}

type UserPreferencesContextType = {
  preferences: UserPreferences
  setLayout: (layout: LayoutType) => void
  setShowConversationPreviews: (show: boolean) => void
  setEnableFileUploads: (enabled: boolean) => void
  setEnableSearchShortcut: (enabled: boolean) => void
  setPromptSuggestions: (enabled: boolean) => void
  setShowToolInvocations: (enabled: boolean) => void
  setMultiModelEnabled: (enabled: boolean) => void
  isModelHidden: (modelId: string) => boolean
  toggleModelVisibility: (modelId: string) => void
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined)

// Default preferences
const defaultPreferences: UserPreferences = {
  layout: "sidebar",
  showConversationPreviews: true,
  enableFileUploads: true,
  enableSearchShortcut: true,
  multiModelEnabled: false,
  promptSuggestions: true,
  showToolInvocations: true,
}

export function UserPreferencesProvider({ 
  children,
  userId,
  initialPreferences
}: { 
  children: React.ReactNode
  userId?: string
  initialPreferences?: UserPreferences
}) {
  // Simple stub implementation - doesn't persist changes
  const preferences = initialPreferences || defaultPreferences

  const setLayout = (layout: LayoutType) => {
    // Stub - no persistence
    console.log('Layout change requested:', layout)
  }

  const setShowConversationPreviews = (show: boolean) => {
    // Stub - no persistence  
    console.log('Show conversation previews change requested:', show)
  }

  const setEnableFileUploads = (enabled: boolean) => {
    // Stub - no persistence
    console.log('Enable file uploads change requested:', enabled)
  }

  const setEnableSearchShortcut = (enabled: boolean) => {
    // Stub - no persistence
    console.log('Enable search shortcut change requested:', enabled)
  }

  const setPromptSuggestions = (enabled: boolean) => {
    // Stub - no persistence
    console.log('Prompt suggestions change requested:', enabled)
  }

  const setShowToolInvocations = (enabled: boolean) => {
    // Stub - no persistence
    console.log('Show tool invocations change requested:', enabled)
  }

  const setMultiModelEnabled = (enabled: boolean) => {
    // Stub - no persistence
    console.log('Multi model enabled change requested:', enabled)
  }

  const isModelHidden = (modelId: string) => {
    // Default - no models are hidden
    return false
  }

  const toggleModelVisibility = (modelId: string) => {
    // Stub - no persistence
    console.log('Model visibility toggle requested:', modelId)
  }

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        setLayout,
        setShowConversationPreviews,
        setEnableFileUploads,
        setEnableSearchShortcut,
        setPromptSuggestions,
        setShowToolInvocations,
        setMultiModelEnabled,
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