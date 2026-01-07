"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useRAGSettingsStore } from "./store"
import type { RAGSettingsStore } from "./store"

const RAGSettingsContext = createContext<RAGSettingsStore | null>(null)

export function RAGSettingsProvider({ children }: { children: ReactNode }) {
  const store = useRAGSettingsStore()

  return (
    <RAGSettingsContext.Provider value={store}>
      {children}
    </RAGSettingsContext.Provider>
  )
}

export function useRAGSettings(): RAGSettingsStore {
  const context = useContext(RAGSettingsContext)
  if (!context) {
    throw new Error("useRAGSettings must be used within RAGSettingsProvider")
  }
  return context
}
