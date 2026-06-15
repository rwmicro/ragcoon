"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"
import { useRAGSettings } from "@/lib/rag-settings-store"
import { useAISettings } from "@/lib/ai-settings-store/provider"
import { useModel } from "@/lib/model-store/provider"
import {
  deleteCollection,
  listCollections,
  RAGCollection,
  uploadFileAsync,
  waitForIngestionJob,
  ingestUrl,
} from "@/lib/api/rag"
import {
  type FileUploadItem,
  type BackendConfig,
  type ExtendedRetrievalSettings,
  type ExtendedIngestionSettings,
  DEFAULT_EXTENDED_RETRIEVAL,
  DEFAULT_EXTENDED_INGESTION,
  DEFAULT_BACKEND_CONFIG,
  isSupportedFolderFile,
  createFileUploadItems,
  createUrlUploadItem,
  resolveChunkingStrategy,
  mapEnvConfigToExtended,
} from "./dashboard-utils"

/**
 * Owns all RAG dashboard state, the settings-store wiring and the
 * collection/upload handlers. Tab components read what they need via
 * {@link useRagDashboard} instead of receiving dozens of props.
 */
function useRagDashboardState() {
  const {
    settings,
    updateRetrievalSettings,
    updateIngestionSettings,
    updateLLMSettings,
    resetRetrievalSettings,
    resetLLMSettings,
    fetchBackendSettings,
  } = useRAGSettings()

  const { models } = useModel()
  const {
    settings: aiSettings,
    setEnableGraphRAG,
    setGraphExpansionDepth,
    setGraphAlpha,
    setEnableMMR,
    setMmrLambda,
    setEnableMultiHop,
    setMaxHops,
  } = useAISettings()

  // Collections state
  const [collections, setCollections] = useState<RAGCollection[]>([])
  const [isLoadingCollections, setIsLoadingCollections] = useState(false)
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)

  // Creation state
  const [showCreationForm, setShowCreationForm] = useState(false)
  const [collectionTitle, setCollectionTitle] = useState("")
  const [uploadQueue, setUploadQueue] = useState<FileUploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [urlInput, setUrlInput] = useState("")

  // Extended settings state (defaults live in dashboard-utils so they can be tested)
  const [extendedRetrieval, setExtendedRetrieval] =
    useState<ExtendedRetrievalSettings>(DEFAULT_EXTENDED_RETRIEVAL)
  const [extendedIngestion, setExtendedIngestion] =
    useState<ExtendedIngestionSettings>(DEFAULT_EXTENDED_INGESTION)
  const [backendConfig, setBackendConfig] = useState<BackendConfig>(DEFAULT_BACKEND_CONFIG)

  // LLM connection test
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle")

  // Collapsible sections
  const [advancedRetrievalOpen, setAdvancedRetrievalOpen] = useState(false)
  const [advancedIngestionOpen, setAdvancedIngestionOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCollections()
    fetchBackendSettings()
    fetchExtendedSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchExtendedSettings = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"
      const response = await fetch(`${API_BASE_URL}/config/env`)
      if (!response.ok) return

      const data = await response.json()
      const config = data.config
      if (!config) return

      const mapped = mapEnvConfigToExtended(config, {
        retrieval: extendedRetrieval,
        ingestion: extendedIngestion,
        backend: backendConfig,
      })
      setExtendedRetrieval(mapped.retrieval)
      setExtendedIngestion(mapped.ingestion)
      setBackendConfig(mapped.backend)
    } catch (error) {
      console.error("Failed to fetch extended settings:", error)
    }
  }

  const fetchCollections = async () => {
    setIsLoadingCollections(true)
    try {
      const result = await listCollections()
      setCollections(result.collections)
    } catch (error) {
      console.error("Failed to load collections", error)
    } finally {
      setIsLoadingCollections(false)
    }
  }

  const handleDeleteCollection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this collection? This action is irreversible.")) return

    try {
      await deleteCollection(id)
      toast.success("Collection deleted")
      fetchCollections()
    } catch (error) {
      toast.error("Failed to delete collection")
    }
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    try {
      const response = await fetch("http://localhost:11434/api/tags")
      if (response.ok) {
        setConnectionStatus("success")
        toast.success("Ollama connection successful")
      } else {
        setConnectionStatus("error")
        toast.error("Ollama connection failed")
      }
    } catch (error) {
      setConnectionStatus("error")
      toast.error("Could not connect to Ollama")
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    const validFiles = files.filter((file) => file.size > 0)

    if (validFiles.length < files.length) {
      toast.error(`${files.length - validFiles.length} empty file(s) skipped`)
    }

    if (validFiles.length > 0) {
      setUploadQueue((prev) => [...prev, ...createFileUploadItems(validFiles)])
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const validFiles = Array.from(e.target.files).filter(
      (file) => isSupportedFolderFile(file.name) && file.size > 0
    )

    if (validFiles.length > 0) {
      const newFiles = createFileUploadItems(validFiles)
      setUploadQueue((prev) => [...prev, ...newFiles])
      toast.success(`${newFiles.length} file(s) added`)
    }

    if (folderInputRef.current) folderInputRef.current.value = ""
  }

  const handleAddUrl = () => {
    if (!urlInput.trim()) return
    setUploadQueue((prev) => [...prev, createUrlUploadItem(urlInput)])
    setUrlInput("")
    toast.success("URL added to queue")
  }

  const handleUploadAll = async () => {
    if (!collectionTitle.trim()) {
      toast.error("Please enter a collection title")
      return
    }

    if (uploadQueue.length === 0) {
      toast.error("Please add at least one file or URL")
      return
    }

    setIsUploading(true)

    for (const item of uploadQueue) {
      setUploadQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "uploading" } : i))
      )

      try {
        const chunkingStrategy = resolveChunkingStrategy(settings.ingestion.chunkingStrategy)
        const commonOptions = {
          collection_id: collectionTitle,
          collection_title: collectionTitle,
          llm_model: settings.llm.model,
          embedding_model: settings.ingestion.embeddingModel,
          embedding_provider: extendedIngestion.embeddingProvider,
          reranker_model: extendedIngestion.rerankerModel,
          use_ollama_embedding: settings.ingestion.useOllamaEmbedding,
          chunk_size: settings.ingestion.chunkSize,
          chunk_overlap: settings.ingestion.chunkOverlap,
          chunking_strategy: chunkingStrategy,
          use_hybrid_embedding: settings.ingestion.useHybridEmbedding,
          use_adaptive_fusion: settings.ingestion.useAdaptiveFusion,
          structural_weight: settings.ingestion.structuralWeight,
        }

        if (item.type === "url") {
          await ingestUrl({ ...commonOptions, url: item.url! })
        } else {
          const job = await uploadFileAsync({ ...commonOptions, file: item.file })

          const completed = await waitForIngestionJob(job.job_id, (update) => {
            setUploadQueue((prev) =>
              prev.map((i) =>
                i.id === item.id ? { ...i, progress: Math.round(update.progress * 100) } : i
              )
            )
          })

          if (completed.status === "failed") {
            throw new Error(completed.error || "Ingestion failed")
          }
        }

        setUploadQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "success", progress: 100 } : i))
        )
      } catch (error) {
        setUploadQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "error", error: error instanceof Error ? error.message : "Error" }
              : i
          )
        )
      }
    }

    setIsUploading(false)
    toast.success("Collection created successfully!")
    setShowCreationForm(false)
    setCollectionTitle("")
    setUploadQueue([])
    fetchCollections()
  }

  const removeFromQueue = (id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id))
  }

  const clearUploadQueue = () => setUploadQueue([])

  const llmModels = models
    .filter((model) => model.providerId === "ollama" || model.providerId === "lmstudio")
    .filter((model) => !model.id.includes("embed"))

  return {
    // settings store
    settings,
    updateRetrievalSettings,
    updateIngestionSettings,
    updateLLMSettings,
    resetRetrievalSettings,
    resetLLMSettings,
    // ai settings store
    aiSettings,
    setEnableGraphRAG,
    setGraphExpansionDepth,
    setGraphAlpha,
    setEnableMMR,
    setMmrLambda,
    setEnableMultiHop,
    setMaxHops,
    // models
    llmModels,
    // collections
    collections,
    isLoadingCollections,
    editingCollectionId,
    setEditingCollectionId,
    fetchCollections,
    handleDeleteCollection,
    // creation / upload
    showCreationForm,
    setShowCreationForm,
    collectionTitle,
    setCollectionTitle,
    uploadQueue,
    isUploading,
    urlInput,
    setUrlInput,
    handleFileChange,
    handleFolderChange,
    handleAddUrl,
    handleUploadAll,
    removeFromQueue,
    clearUploadQueue,
    fileInputRef,
    folderInputRef,
    // extended settings
    extendedRetrieval,
    setExtendedRetrieval,
    extendedIngestion,
    setExtendedIngestion,
    backendConfig,
    setBackendConfig,
    // connection test
    isTestingConnection,
    connectionStatus,
    handleTestConnection,
    // collapsibles
    advancedRetrievalOpen,
    setAdvancedRetrievalOpen,
    advancedIngestionOpen,
    setAdvancedIngestionOpen,
  }
}

type RagDashboardValue = ReturnType<typeof useRagDashboardState>

const RagDashboardContext = createContext<RagDashboardValue | null>(null)

export function RagDashboardProvider({ children }: { children: ReactNode }) {
  const value = useRagDashboardState()
  return <RagDashboardContext.Provider value={value}>{children}</RagDashboardContext.Provider>
}

export function useRagDashboard(): RagDashboardValue {
  const ctx = useContext(RagDashboardContext)
  if (!ctx) {
    throw new Error("useRagDashboard must be used within a RagDashboardProvider")
  }
  return ctx
}
