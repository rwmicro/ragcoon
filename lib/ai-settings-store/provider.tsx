"use client"

import { createContext, useContext, useState, useEffect } from "react"

// AI behavior settings
export type AISettings = {
  // Model parameters
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number

  // Agentic capabilities
  enableWebSearch: boolean
  maxSearchResults: number

  // Default model
  defaultModel: string | null

  // Voice settings
  autoSendVoice: boolean

  // Message retention
  messageRetention: number // number of messages to keep in context

  // RAG - Graph RAG parameters
  enableGraphRAG: boolean
  graphExpansionDepth: number
  graphAlpha: number

  // RAG - HyDE parameters
  enableHyDE: boolean
  hydeFusion: "average" | "max" | "rrf"
  numHypotheticalDocs: number

  // RAG - Multi-Query parameters
  enableMultiQuery: boolean
  numQueryVariations: number

  // RAG - Multilingual parameters
  enableMultilingual: boolean
  queryLanguage: string | null
  useMultilingualEmbeddings: boolean
  useMultilingualBM25: boolean
  useMultilingualHyDE: boolean
  useMultilingualClassifier: boolean
  detectLanguage: boolean

  // RAG - Advanced retrieval parameters
  enableMultiHop: boolean
  maxHops: number
  enableContrastive: boolean
  enableMMR: boolean
  mmrLambda: number
  enableAdaptiveAlpha: boolean
}

type AISettingsContextType = {
  settings: AISettings
  setTemperature: (temperature: number) => void
  setMaxTokens: (maxTokens: number) => void
  setTopP: (topP: number) => void
  setFrequencyPenalty: (penalty: number) => void
  setPresencePenalty: (penalty: number) => void
  setEnableWebSearch: (enabled: boolean) => void
  setMaxSearchResults: (max: number) => void
  setDefaultModel: (model: string | null) => void
  setAutoSendVoice: (enabled: boolean) => void
  setMessageRetention: (count: number) => void
  // RAG - Graph RAG
  setEnableGraphRAG: (enabled: boolean) => void
  setGraphExpansionDepth: (depth: number) => void
  setGraphAlpha: (alpha: number) => void
  // RAG - HyDE
  setEnableHyDE: (enabled: boolean) => void
  setHydeFusion: (method: "average" | "max" | "rrf") => void
  setNumHypotheticalDocs: (num: number) => void
  // RAG - Multi-Query
  setEnableMultiQuery: (enabled: boolean) => void
  setNumQueryVariations: (num: number) => void
  // RAG - Multilingual
  setEnableMultilingual: (enabled: boolean) => void
  setQueryLanguage: (language: string | null) => void
  setUseMultilingualEmbeddings: (enabled: boolean) => void
  setUseMultilingualBM25: (enabled: boolean) => void
  setUseMultilingualHyDE: (enabled: boolean) => void
  setUseMultilingualClassifier: (enabled: boolean) => void
  setDetectLanguage: (enabled: boolean) => void
  // RAG - Advanced retrieval
  setEnableMultiHop: (enabled: boolean) => void
  setMaxHops: (hops: number) => void
  setEnableContrastive: (enabled: boolean) => void
  setEnableMMR: (enabled: boolean) => void
  setMmrLambda: (lambda: number) => void
  setEnableAdaptiveAlpha: (enabled: boolean) => void
  resetToDefaults: () => void
}

const AISettingsContext = createContext<AISettingsContextType | undefined>(undefined)

// Default AI settings
const defaultSettings: AISettings = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  enableWebSearch: false,
  maxSearchResults: 5,
  defaultModel: null,
  autoSendVoice: false,
  messageRetention: 50,
  // RAG - Graph RAG
  enableGraphRAG: false,
  graphExpansionDepth: 1,
  graphAlpha: 0.7,
  // RAG - HyDE
  enableHyDE: false,
  hydeFusion: "rrf",
  numHypotheticalDocs: 3,
  // RAG - Multi-Query
  enableMultiQuery: false,
  numQueryVariations: 2,
  // RAG - Multilingual (auto-enabled backend features)
  enableMultilingual: true, // Always enabled in backend
  queryLanguage: null, // Auto-detect by default
  useMultilingualEmbeddings: true, // Always enabled in backend
  useMultilingualBM25: true, // Always enabled in backend
  useMultilingualHyDE: false, // User-controlled (available in HyDE section)
  useMultilingualClassifier: true, // Always enabled in backend
  detectLanguage: true, // Always enabled in backend
  // RAG - Advanced retrieval
  enableMultiHop: false,
  maxHops: 3,
  enableContrastive: false,
  enableMMR: false,
  mmrLambda: 0.7,
  enableAdaptiveAlpha: false,
}

// LocalStorage key
const AI_SETTINGS_STORAGE_KEY = "ai-settings"

export function AISettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode
  initialSettings?: AISettings
}) {
  // Initialize state from localStorage or defaults
  const [settings, setSettings] = useState<AISettings>(() => {
    if (typeof window === "undefined") {
      return initialSettings || defaultSettings
    }

    try {
      const stored = localStorage.getItem(AI_SETTINGS_STORAGE_KEY)
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error("Failed to load AI settings from localStorage:", error)
    }

    return initialSettings || defaultSettings
  })

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      } catch (error) {
        console.error("Failed to save AI settings to localStorage:", error)
      }
    }
  }, [settings])

  const setTemperature = (temperature: number) => {
    setSettings((prev) => ({ ...prev, temperature }))
  }

  const setMaxTokens = (maxTokens: number) => {
    setSettings((prev) => ({ ...prev, maxTokens }))
  }

  const setTopP = (topP: number) => {
    setSettings((prev) => ({ ...prev, topP }))
  }

  const setFrequencyPenalty = (frequencyPenalty: number) => {
    setSettings((prev) => ({ ...prev, frequencyPenalty }))
  }

  const setPresencePenalty = (presencePenalty: number) => {
    setSettings((prev) => ({ ...prev, presencePenalty }))
  }

  const setEnableWebSearch = (enableWebSearch: boolean) => {
    setSettings((prev) => ({ ...prev, enableWebSearch }))
  }

  const setMaxSearchResults = (maxSearchResults: number) => {
    setSettings((prev) => ({ ...prev, maxSearchResults }))
  }

  const setDefaultModel = (defaultModel: string | null) => {
    setSettings((prev) => ({ ...prev, defaultModel }))
  }

  const setAutoSendVoice = (autoSendVoice: boolean) => {
    setSettings((prev) => ({ ...prev, autoSendVoice }))
  }

  const setMessageRetention = (messageRetention: number) => {
    setSettings((prev) => ({ ...prev, messageRetention }))
  }

  // RAG - Graph RAG setters
  const setEnableGraphRAG = (enableGraphRAG: boolean) => {
    setSettings((prev) => ({ ...prev, enableGraphRAG }))
  }

  const setGraphExpansionDepth = (graphExpansionDepth: number) => {
    setSettings((prev) => ({ ...prev, graphExpansionDepth }))
  }

  const setGraphAlpha = (graphAlpha: number) => {
    setSettings((prev) => ({ ...prev, graphAlpha }))
  }

  // RAG - HyDE setters
  const setEnableHyDE = (enableHyDE: boolean) => {
    setSettings((prev) => ({ ...prev, enableHyDE }))
  }

  const setHydeFusion = (hydeFusion: "average" | "max" | "rrf") => {
    setSettings((prev) => ({ ...prev, hydeFusion }))
  }

  const setNumHypotheticalDocs = (numHypotheticalDocs: number) => {
    setSettings((prev) => ({ ...prev, numHypotheticalDocs }))
  }

  // RAG - Multi-Query setters
  const setEnableMultiQuery = (enableMultiQuery: boolean) => {
    setSettings((prev) => ({ ...prev, enableMultiQuery }))
  }

  const setNumQueryVariations = (numQueryVariations: number) => {
    setSettings((prev) => ({ ...prev, numQueryVariations }))
  }

  // RAG - Multilingual setters
  const setEnableMultilingual = (enableMultilingual: boolean) => {
    setSettings((prev) => ({ ...prev, enableMultilingual }))
  }

  const setQueryLanguage = (queryLanguage: string | null) => {
    setSettings((prev) => ({ ...prev, queryLanguage }))
  }

  const setUseMultilingualEmbeddings = (useMultilingualEmbeddings: boolean) => {
    setSettings((prev) => ({ ...prev, useMultilingualEmbeddings }))
  }

  const setUseMultilingualBM25 = (useMultilingualBM25: boolean) => {
    setSettings((prev) => ({ ...prev, useMultilingualBM25 }))
  }

  const setUseMultilingualHyDE = (useMultilingualHyDE: boolean) => {
    setSettings((prev) => ({ ...prev, useMultilingualHyDE }))
  }

  const setUseMultilingualClassifier = (useMultilingualClassifier: boolean) => {
    setSettings((prev) => ({ ...prev, useMultilingualClassifier }))
  }

  const setDetectLanguage = (detectLanguage: boolean) => {
    setSettings((prev) => ({ ...prev, detectLanguage }))
  }

  // RAG - Advanced retrieval setters
  const setEnableMultiHop = (enableMultiHop: boolean) => {
    setSettings((prev) => ({ ...prev, enableMultiHop }))
  }

  const setMaxHops = (maxHops: number) => {
    setSettings((prev) => ({ ...prev, maxHops }))
  }

  const setEnableContrastive = (enableContrastive: boolean) => {
    setSettings((prev) => ({ ...prev, enableContrastive }))
  }

  const setEnableMMR = (enableMMR: boolean) => {
    setSettings((prev) => ({ ...prev, enableMMR }))
  }

  const setMmrLambda = (mmrLambda: number) => {
    setSettings((prev) => ({ ...prev, mmrLambda }))
  }

  const setEnableAdaptiveAlpha = (enableAdaptiveAlpha: boolean) => {
    setSettings((prev) => ({ ...prev, enableAdaptiveAlpha }))
  }

  const resetToDefaults = () => {
    setSettings(defaultSettings)
  }

  return (
    <AISettingsContext.Provider
      value={{
        settings,
        setTemperature,
        setMaxTokens,
        setTopP,
        setFrequencyPenalty,
        setPresencePenalty,
        setEnableWebSearch,
        setMaxSearchResults,
        setDefaultModel,
        setAutoSendVoice,
        setMessageRetention,
        // RAG - Graph RAG
        setEnableGraphRAG,
        setGraphExpansionDepth,
        setGraphAlpha,
        // RAG - HyDE
        setEnableHyDE,
        setHydeFusion,
        setNumHypotheticalDocs,
        // RAG - Multi-Query
        setEnableMultiQuery,
        setNumQueryVariations,
        // RAG - Multilingual
        setEnableMultilingual,
        setQueryLanguage,
        setUseMultilingualEmbeddings,
        setUseMultilingualBM25,
        setUseMultilingualHyDE,
        setUseMultilingualClassifier,
        setDetectLanguage,
        // RAG - Advanced retrieval
        setEnableMultiHop,
        setMaxHops,
        setEnableContrastive,
        setEnableMMR,
        setMmrLambda,
        setEnableAdaptiveAlpha,
        resetToDefaults,
      }}
    >
      {children}
    </AISettingsContext.Provider>
  )
}

export function useAISettings() {
  const context = useContext(AISettingsContext)
  if (context === undefined) {
    throw new Error("useAISettings must be used within an AISettingsProvider")
  }
  return context
}
