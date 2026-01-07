import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  RAGSettings,
  RetrievalSettings,
  IngestionSettings,
  LLMSettings,
  UISettings,
} from "./types"
import {
  DEFAULT_RAG_SETTINGS,
  DEFAULT_RETRIEVAL_SETTINGS,
  DEFAULT_INGESTION_SETTINGS,
  DEFAULT_LLM_SETTINGS,
  DEFAULT_UI_SETTINGS,
} from "./types"

export interface RAGSettingsStore {
  settings: RAGSettings

  // Retrieval settings actions
  updateRetrievalSettings: (settings: Partial<RetrievalSettings>) => void
  resetRetrievalSettings: () => void

  // Ingestion settings actions
  updateIngestionSettings: (settings: Partial<IngestionSettings>) => void
  resetIngestionSettings: () => void

  // LLM settings actions
  updateLLMSettings: (settings: Partial<LLMSettings>) => void
  resetLLMSettings: () => void

  // UI settings actions
  updateUISettings: (settings: Partial<UISettings>) => void

  // Collection tracking
  setLastCollectionId: (id: string) => void

  // Sync settings with backend
  fetchBackendSettings: () => Promise<void>

  // Reset all settings
  resetAllSettings: () => void
}

export const useRAGSettingsStore = create<RAGSettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_RAG_SETTINGS,

      updateRetrievalSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            retrieval: {
              ...state.settings.retrieval,
              ...newSettings,
            },
          },
        })),

      resetRetrievalSettings: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            retrieval: DEFAULT_RETRIEVAL_SETTINGS,
          },
        })),

      updateIngestionSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ingestion: {
              ...state.settings.ingestion,
              ...newSettings,
            },
          },
        })),

      resetIngestionSettings: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            ingestion: DEFAULT_INGESTION_SETTINGS,
          },
        })),

      updateLLMSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            llm: {
              ...state.settings.llm,
              ...newSettings,
            },
          },
        })),

      resetLLMSettings: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            llm: DEFAULT_LLM_SETTINGS,
          },
        })),

      updateUISettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ui: {
              ...state.settings.ui,
              ...newSettings,
            },
          },
        })),

      setLastCollectionId: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            lastCollectionId: id,
          },
        })),

      fetchBackendSettings: async () => {
        try {
          // Allow override via env var or assume localhost:8001
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
          const response = await fetch(`${API_BASE_URL}/config/env`);

          if (!response.ok) {
            console.error("Failed to fetch backend settings");
            return;
          }

          const data = await response.json();
          const config = data.config; // The structured config we added to the backend

          if (!config) return;

          set((state) => {
            // Construct new settings based on backend config, falling back to current state if missing
            const newRetrieval = { ...state.settings.retrieval };
            if (config.retrieval) {
              if (config.retrieval.TOP_K) newRetrieval.topK = Number(config.retrieval.TOP_K);
              if (config.retrieval.USE_HYBRID_SEARCH !== undefined) newRetrieval.hybridSearch = Boolean(config.retrieval.USE_HYBRID_SEARCH);
              // Map other retrieval settings as needed
            }
            if (config.reranking) {
              if (config.reranking.USE_RERANKING !== undefined) newRetrieval.useReranking = Boolean(config.reranking.USE_RERANKING);
            }

            const newIngestion = { ...state.settings.ingestion };
            if (config.chunking) {
              if (config.chunking.CHUNK_SIZE) newIngestion.chunkSize = Number(config.chunking.CHUNK_SIZE);
              if (config.chunking.CHUNK_OVERLAP) newIngestion.chunkOverlap = Number(config.chunking.CHUNK_OVERLAP);
              if (config.chunking.CHUNKING_STRATEGY) newIngestion.chunkingStrategy = config.chunking.CHUNKING_STRATEGY;
            }
            if (config.embedding) {
              if (config.embedding.EMBEDDING_MODEL) newIngestion.embeddingModel = config.embedding.EMBEDDING_MODEL;
            }

            const newLLM = { ...state.settings.llm };
            if (config.llm) {
              if (config.llm.LLM_MODEL) newLLM.model = config.llm.LLM_MODEL;
              if (config.llm.LLM_TEMPERATURE) newLLM.temperature = Number(config.llm.LLM_TEMPERATURE);
              if (config.llm.LLM_MAX_TOKENS) newLLM.maxTokens = Number(config.llm.LLM_MAX_TOKENS);
            }

            return {
              settings: {
                ...state.settings,
                retrieval: newRetrieval,
                ingestion: newIngestion,
                llm: newLLM,
              }
            };
          });
        } catch (error) {
          console.error("Error syncing backend settings:", error);
        }
      },

      resetAllSettings: () =>
        set({
          settings: DEFAULT_RAG_SETTINGS,
        }),
    }),
    {
      name: "rag-settings-storage",
      version: 1,
    }
  )
)
