"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Database,
  Plus,
  Trash,
  PencilSimple,
  Eye,
  Cpu,
  Lightning,
  Upload,
  FileText,
  FilePdf,
  X,
  CircleNotch,
  Check,
  Folder,
  Info,
  GearSix,
  MagnifyingGlass,
  ArrowsClockwise,
  CheckCircle,
  XCircle,
  Files,
  Graph,
  MagicWand,
  ListMagnifyingGlass,
  HardDrives,
  Gauge,
  ChartBar,
  Stack,
  TrendUp,
  Clock,
  Warning,
  Translate,
  Globe,
} from "@phosphor-icons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRAGSettings } from "@/lib/rag-settings-store"
import type { RetrievalStrategy, ResponseLength } from "@/lib/rag-settings-store"
import { useAISettings } from "@/lib/ai-settings-store/provider"
import { useModel } from "@/lib/model-store/provider"
import {
  deleteCollection,
  listCollections,
  RAGCollection,
  uploadFileAsync,
  waitForIngestionJob,
  ingestUrl,
  getCollection,
  getRAGStats,
  getQueryLogs,
} from "@/lib/api/rag"
import { DialogEditCollection } from "./dialog-edit-collection"
import { DialogVisualizeCollection } from "./dialog-visualize-collection"
import { EmbeddingModelSelector } from "./embedding-model-selector"
import { StatsDashboard } from "./stats-dashboard"
import { motion, AnimatePresence } from "framer-motion"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { CaretDown } from "@phosphor-icons/react"

interface FileUploadItem {
  file: File
  id: string
  status: "pending" | "uploading" | "success" | "error"
  progress: number
  error?: string
  type: "file" | "url"
  url?: string
}

// Extended settings for backend config
interface BackendConfig {
  // Vector Store
  vectorStoreType: "lancedb" | "faiss" | "chroma" | "sqlite"

  // Embedding
  embeddingDevice: "cuda" | "cpu"
  embeddingBatchSize: number
  normalizeEmbeddings: boolean

  // Performance
  maxWorkers: number
  gpuMemoryFraction: number

  // Advanced
  useContextualEmbeddings: boolean
  enableQueryLogging: boolean
  routerMode: "rules" | "llm"
  minSimilarityScore: number
}

// Extended retrieval settings
interface ExtendedRetrievalSettings {
  // Two-stage retrieval
  initialRetrievalK: number
  dedupSimilarityThreshold: number

  // Hybrid search advanced
  hybridAlpha: number

  // Score normalization
  scoreNormalizationMethod: "minmax" | "zscore" | "rrf"
  rrfK: number

  // Reranking advanced
  rerankerTopK: number

  // Compression
  maxContextTokens: number
  compressionRatio: number
}

// Extended ingestion settings
interface ExtendedIngestionSettings {
  minChunkSize: number
  maxChunkSize: number
  embeddingProvider: "ollama" | "huggingface" | "auto"
  rerankerModel: string
}

export function RAGDashboardComplete() {
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
  const [visualizingCollectionId, setVisualizingCollectionId] = useState<string | null>(null)

  // Creation state
  const [showCreationForm, setShowCreationForm] = useState(false)
  const [collectionTitle, setCollectionTitle] = useState("")
  const [uploadQueue, setUploadQueue] = useState<FileUploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [urlInput, setUrlInput] = useState("")

  // Extended settings state
  const [extendedRetrieval, setExtendedRetrieval] = useState<ExtendedRetrievalSettings>({
    initialRetrievalK: 50,
    dedupSimilarityThreshold: 0.90,
    hybridAlpha: 0.7,
    scoreNormalizationMethod: "minmax",
    rrfK: 60,
    rerankerTopK: 10,
    maxContextTokens: 4000,
    compressionRatio: 0.6,
  })

  const [extendedIngestion, setExtendedIngestion] = useState<ExtendedIngestionSettings>({
    minChunkSize: 100,
    maxChunkSize: 2000,
    embeddingProvider: "auto",
    rerankerModel: "BAAI/bge-reranker-large",
  })

  const [backendConfig, setBackendConfig] = useState<BackendConfig>({
    vectorStoreType: "sqlite",
    embeddingDevice: "cuda",
    embeddingBatchSize: 256,
    normalizeEmbeddings: true,
    maxWorkers: 16,
    gpuMemoryFraction: 0.9,
    useContextualEmbeddings: true,
    enableQueryLogging: true,
    routerMode: "rules",
    minSimilarityScore: 0.33,
  })

  // LLM Connection test
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle")

  // Collapsible sections
  const [advancedRetrievalOpen, setAdvancedRetrievalOpen] = useState(false)
  const [advancedIngestionOpen, setAdvancedIngestionOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCollections()
    // Sync settings from backend (store)
    fetchBackendSettings()
    // Sync extended settings (local state)
    fetchExtendedSettings()
  }, [])


  const fetchExtendedSettings = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      const response = await fetch(`${API_BASE_URL}/config/env`);

      if (!response.ok) return;

      const data = await response.json();
      const config = data.config;

      if (!config) return;

      // Update Extended Retrieval
      setExtendedRetrieval(prev => ({
        ...prev,
        initialRetrievalK: Number(config.other?.INITIAL_RETRIEVAL_K ?? prev.initialRetrievalK),
        dedupSimilarityThreshold: Number(config.other?.DEDUP_SIMILARITY_THRESHOLD ?? prev.dedupSimilarityThreshold),
        hybridAlpha: Number(config.retrieval?.HYBRID_ALPHA ?? prev.hybridAlpha),
        scoreNormalizationMethod: (config.other?.SCORE_NORMALIZATION_METHOD as any) ?? prev.scoreNormalizationMethod,
        rrfK: Number(config.other?.RRF_K ?? prev.rrfK),
        rerankerTopK: Number(config.reranking?.RERANKER_TOP_K ?? prev.rerankerTopK),
        maxContextTokens: Number(config.compression?.MAX_CONTEXT_TOKENS ?? prev.maxContextTokens),
        compressionRatio: Number(config.compression?.COMPRESSION_RATIO ?? prev.compressionRatio),
      }));

      // Update Extended Ingestion
      setExtendedIngestion(prev => ({
        ...prev,
        minChunkSize: Number(config.other?.MIN_CHUNK_SIZE ?? prev.minChunkSize),
        maxChunkSize: Number(config.other?.MAX_CHUNK_SIZE ?? prev.maxChunkSize),
        rerankerModel: config.reranking?.RERANKER_MODEL ?? prev.rerankerModel,
      }));

      // Update Backend Config Display
      setBackendConfig(prev => ({
        ...prev,
        vectorStoreType: (config.vector_store?.VECTOR_STORE_TYPE as any) ?? prev.vectorStoreType,
        embeddingDevice: (config.embedding?.EMBEDDING_DEVICE as any) ?? prev.embeddingDevice,
        embeddingBatchSize: Number(config.embedding?.EMBEDDING_BATCH_SIZE ?? prev.embeddingBatchSize),
        normalizeEmbeddings: Boolean(config.embedding?.NORMALIZE_EMBEDDINGS ?? prev.normalizeEmbeddings),
        maxWorkers: Number(config.other?.MAX_WORKERS ?? prev.maxWorkers),
        gpuMemoryFraction: Number(config.other?.GPU_MEMORY_FRACTION ?? prev.gpuMemoryFraction),
        useContextualEmbeddings: Boolean(config.other?.USE_CONTEXTUAL_EMBEDDINGS ?? prev.useContextualEmbeddings),
        enableQueryLogging: Boolean(config.other?.ENABLE_QUERY_LOGGING ?? prev.enableQueryLogging),
        routerMode: (config.other?.ROUTER_MODE as any) ?? prev.routerMode,
        minSimilarityScore: Number(config.retrieval?.MIN_SIMILARITY_SCORE ?? prev.minSimilarityScore),
      }));

    } catch (error) {
      console.error("Failed to fetch extended settings:", error);
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

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    const validFiles = files.filter((file) => file.size > 0)

    if (validFiles.length < files.length) {
      toast.error(`${files.length - validFiles.length} empty file(s) skipped`)
    }

    if (validFiles.length > 0) {
      const newFiles = validFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substring(7),
        status: "pending" as const,
        progress: 0,
        type: "file" as const,
      }))
      setUploadQueue((prev) => [...prev, ...newFiles])
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const supportedFiles = Array.from(e.target.files).filter((file) => {
      const ext = file.name.toLowerCase()
      return (
        ext.endsWith(".pdf") ||
        ext.endsWith(".md") ||
        ext.endsWith(".markdown") ||
        ext.endsWith(".csv") ||
        ext.endsWith(".tsv")
      )
    })

    const validFiles = supportedFiles.filter((file) => file.size > 0)

    if (validFiles.length > 0) {
      const newFiles = validFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substring(7),
        status: "pending" as const,
        progress: 0,
        type: "file" as const,
      }))
      setUploadQueue((prev) => [...prev, ...newFiles])
      toast.success(`${newFiles.length} file(s) added`)
    }

    if (folderInputRef.current) folderInputRef.current.value = ""
  }

  const handleAddUrl = () => {
    if (!urlInput.trim()) return

    const newUrl: FileUploadItem = {
      file: new File([], urlInput),
      id: Math.random().toString(36).substring(7),
      status: "pending",
      progress: 0,
      type: "url",
      url: urlInput,
    }

    setUploadQueue((prev) => [...prev, newUrl])
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
        // Map chunking strategy - "smart" is not supported by backend, fallback to "semantic"
        const chunkingStrategy = settings.ingestion.chunkingStrategy === "smart"
          ? "semantic" as const
          : settings.ingestion.chunkingStrategy as "semantic" | "recursive" | "markdown"

        if (item.type === "url") {
          await ingestUrl({
            collection_id: collectionTitle,
            collection_title: collectionTitle,
            url: item.url!,
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
          })
        } else {
          const job = await uploadFileAsync({
            collection_id: collectionTitle,
            collection_title: collectionTitle,
            file: item.file,
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
          })

          const completed = await waitForIngestionJob(
            job.job_id,
            (update) => {
              setUploadQueue((prev) =>
                prev.map((i) =>
                  i.id === item.id
                    ? { ...i, progress: Math.round(update.progress * 100) }
                    : i
                )
              )
            }
          )

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

  // Filter models
  const ollamaModels = models.filter((model) => model.providerId === "ollama")
  const llmModels = ollamaModels.filter((model) => !model.id.includes("embed"))

  const responseLengthOptions: { value: ResponseLength; label: string; desc: string }[] = [
    { value: "concise", label: "Concise", desc: "Short answers" },
    { value: "balanced", label: "Balanced", desc: "Moderate detail" },
    { value: "detailed", label: "Detailed", desc: "Comprehensive" },
  ]

  const maxTokensForLength = {
    concise: 512,
    balanced: 2048,
    detailed: 4096,
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">RAG Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Complete configuration for RAG collections, ingestion, retrieval, and backend
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="collections" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="collections">
            <Database className="size-4 mr-2" />
            Collections
          </TabsTrigger>
          <TabsTrigger value="ingestion">
            <GearSix className="size-4 mr-2" />
            Ingestion
          </TabsTrigger>
          <TabsTrigger value="retrieval">
            <MagnifyingGlass className="size-4 mr-2" />
            Retrieval
          </TabsTrigger>
          <TabsTrigger value="llm">
            <Cpu className="size-4 mr-2" />
            LLM & Prompt
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <ChartBar className="size-4 mr-2" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="backend">
            <HardDrives className="size-4 mr-2" />
            Backend Config
          </TabsTrigger>
        </TabsList>

        {/* ========== COLLECTIONS TAB ========== */}
        <TabsContent value="collections" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Collections</h2>
            <Button onClick={() => setShowCreationForm(!showCreationForm)} size="sm">
              <Plus className="size-4 mr-2" />
              New Collection
            </Button>
          </div>

          {/* Creation Form */}
          <AnimatePresence>
            {showCreationForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border rounded-xl overflow-hidden"
              >
                <div className="bg-muted/30 p-4 border-b">
                  <h3 className="font-semibold">Create New Collection</h3>
                </div>
                <div className="p-6 space-y-6">
                  {/* Collection Title */}
                  <div className="space-y-2">
                    <Label>Collection Title *</Label>
                    <Input
                      value={collectionTitle}
                      onChange={(e) => setCollectionTitle(e.target.value)}
                      placeholder="e.g., My Documentation"
                    />
                  </div>

                  {/* File Upload */}
                  <div className="space-y-3">
                    <Label>Documents</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <FileText className="size-4 mr-2" />
                        Files
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}>
                        <Folder className="size-4 mr-2" />
                        Folder
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.md,.markdown,.csv,.tsv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <input
                      ref={folderInputRef}
                      type="file"
                      multiple
                      onChange={handleFolderChange}
                      className="hidden"
                      {...({ webkitdirectory: "", directory: "" } as any)}
                    />
                  </div>

                  {/* URL Input */}
                  <div className="space-y-2">
                    <Label>Add URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/docs"
                        onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                      />
                      <Button variant="outline" size="sm" onClick={handleAddUrl}>
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Upload Queue */}
                  {uploadQueue.length > 0 && (
                    <div className="space-y-2">
                      <Label>Queue ({uploadQueue.length})</Label>
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {uploadQueue.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {item.type === "url" ? (
                                <Globe className="size-4 shrink-0" />
                              ) : (
                                <FileText className="size-4 shrink-0" />
                              )}
                              <span className="text-sm truncate">{item.type === "url" ? item.url : item.file.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.status === "success" && <Check className="size-4 text-green-500" />}
                              {item.status === "uploading" && <CircleNotch className="size-4 animate-spin" />}
                              {item.status === "error" && <X className="size-4 text-red-500" />}
                              {item.status === "pending" && (
                                <Button variant="ghost" size="icon" className="size-6" onClick={() => removeFromQueue(item.id)}>
                                  <X className="size-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreationForm(false)
                        setCollectionTitle("")
                        setUploadQueue([])
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUploadAll} disabled={isUploading || uploadQueue.length === 0 || !collectionTitle.trim()}>
                      {isUploading ? (
                        <>
                          <CircleNotch className="size-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="size-4 mr-2" />
                          Create Collection
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collections List */}
          {isLoadingCollections ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <CircleNotch className="size-6 animate-spin mr-2" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : collections.length > 0 ? (
            <div className="grid gap-3">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/5 transition-all hover:shadow-sm group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{collection.title}</h4>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                        {collection.file_count} files
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md">
                        <Cpu className="size-3" />
                        {collection.llm_model}
                      </span>
                      <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md">
                        <Lightning className="size-3" />
                        {collection.embedding_model}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                      onClick={() => setVisualizingCollectionId(collection.id)}
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={() => setEditingCollectionId(collection.id)}
                    >
                      <PencilSimple className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteCollection(collection.id)}
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/10 flex flex-col items-center justify-center">
              <div className="size-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                <Database className="size-6 text-muted-foreground/50" />
              </div>
              <h3 className="text-sm font-medium mb-1">No Collections</h3>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Create a new collection to start chatting with your documents.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ========== INGESTION TAB ========== */}
        <TabsContent value="ingestion" className="space-y-6 mt-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Ingestion Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configuration for document processing and indexing
            </p>
          </div>

          <div className="grid gap-6">
            {/* Embedding Model */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <EmbeddingModelSelector
                value={settings.ingestion.embeddingModel}
                onChange={(value) => updateIngestionSettings({ embeddingModel: value })}
              />
            </div>

            {/* Embedding Provider */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <Label className="text-sm font-medium">Embedding Provider</Label>
              <Select
                value={extendedIngestion.embeddingProvider}
                onValueChange={(value: "ollama" | "huggingface" | "auto") =>
                  setExtendedIngestion({ ...extendedIngestion, embeddingProvider: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (detect from model name)</SelectItem>
                  <SelectItem value="huggingface">HuggingFace</SelectItem>
                  <SelectItem value="ollama">Ollama</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Provider for embedding model inference
              </p>
            </div>

            {/* Reranker Model */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <Label className="text-sm font-medium">Reranker Model</Label>
              <Select
                value={extendedIngestion.rerankerModel}
                onValueChange={(value) => setExtendedIngestion({ ...extendedIngestion, rerankerModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAAI/bge-reranker-large">BAAI BGE Reranker Large (560M)</SelectItem>
                  <SelectItem value="BAAI/bge-reranker-base">BAAI BGE Reranker Base (278M)</SelectItem>
                  <SelectItem value="BAAI/bge-reranker-v2-m3">BAAI BGE Reranker v2 M3 (568M)</SelectItem>
                  <SelectItem value="cross-encoder/ms-marco-MiniLM-L-6-v2">MS MARCO MiniLM L6 (Small, 80M)</SelectItem>
                  <SelectItem value="cross-encoder/ms-marco-MiniLM-L-12-v2">MS MARCO MiniLM L12 (Medium, 134M)</SelectItem>
                  <SelectItem value="jinaai/jina-reranker-v1-base-en">Jina Reranker v1 Base (137M)</SelectItem>
                  <SelectItem value="jinaai/jina-reranker-v1-turbo-en">Jina Reranker v1 Turbo (38M)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Cross-encoder model for reranking retrieved chunks
              </p>
            </div>

            {/* Chunk Size */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Target Chunk Size (tokens)</Label>
                <Badge variant="secondary" className="tabular-nums">
                  {settings.ingestion.chunkSize}
                </Badge>
              </div>
              <Slider
                value={[settings.ingestion.chunkSize]}
                onValueChange={([value]) => updateIngestionSettings({ chunkSize: value })}
                min={200}
                max={2000}
                step={100}
              />
              <p className="text-xs text-muted-foreground">Target chunk size in tokens</p>
            </div>

            {/* Min/Max Chunk Size */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3 p-5 rounded-xl border bg-card/50">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Min Chunk Size</Label>
                  <Badge variant="secondary" className="tabular-nums text-[10px]">
                    {extendedIngestion.minChunkSize}
                  </Badge>
                </div>
                <Slider
                  value={[extendedIngestion.minChunkSize]}
                  onValueChange={([value]) => setExtendedIngestion({ ...extendedIngestion, minChunkSize: value })}
                  min={50}
                  max={500}
                  step={50}
                />
              </div>

              <div className="space-y-3 p-5 rounded-xl border bg-card/50">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Max Chunk Size</Label>
                  <Badge variant="secondary" className="tabular-nums text-[10px]">
                    {extendedIngestion.maxChunkSize}
                  </Badge>
                </div>
                <Slider
                  value={[extendedIngestion.maxChunkSize]}
                  onValueChange={([value]) => setExtendedIngestion({ ...extendedIngestion, maxChunkSize: value })}
                  min={1000}
                  max={4000}
                  step={500}
                />
              </div>
            </div>

            {/* Chunk Overlap */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Chunk Overlap</Label>
                <Badge variant="secondary" className="tabular-nums">
                  {settings.ingestion.chunkOverlap}
                </Badge>
              </div>
              <Slider
                value={[settings.ingestion.chunkOverlap]}
                onValueChange={([value]) => updateIngestionSettings({ chunkOverlap: value })}
                min={0}
                max={500}
                step={50}
              />
              <p className="text-xs text-muted-foreground">Overlap between consecutive chunks</p>
            </div>

            {/* Advanced Ingestion Options */}
            <Collapsible open={advancedIngestionOpen} onOpenChange={setAdvancedIngestionOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <GearSix className="size-4" />
                    Advanced Ingestion Options
                  </span>
                  <CaretDown
                    className={cn(
                      "size-4 transition-transform",
                      advancedIngestionOpen && "transform rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4 mt-4">
                <div className="space-y-4 p-5 rounded-xl border bg-card/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Ollama Embedding</Label>
                      <p className="text-xs text-muted-foreground">Use Ollama for embeddings</p>
                    </div>
                    <Switch
                      checked={settings.ingestion.useOllamaEmbedding}
                      onCheckedChange={(checked) => updateIngestionSettings({ useOllamaEmbedding: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Hybrid Embedding</Label>
                      <p className="text-xs text-muted-foreground">Combine linguistic and structural</p>
                    </div>
                    <Switch
                      checked={settings.ingestion.useHybridEmbedding}
                      onCheckedChange={(checked) => updateIngestionSettings({ useHybridEmbedding: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Adaptive Fusion</Label>
                      <p className="text-xs text-muted-foreground text-orange-500">
                        ⚠️ Uses 3x memory (loads 3 models)
                      </p>
                    </div>
                    <Switch
                      checked={settings.ingestion.useAdaptiveFusion}
                      onCheckedChange={(checked) => updateIngestionSettings({ useAdaptiveFusion: checked })}
                    />
                  </div>

                  {settings.ingestion.useHybridEmbedding && (
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs">Structural Weight</Label>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {settings.ingestion.structuralWeight.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        value={[settings.ingestion.structuralWeight]}
                        onValueChange={([value]) => updateIngestionSettings({ structuralWeight: value })}
                        min={0}
                        max={1}
                        step={0.1}
                      />
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </TabsContent>

        {/* ========== RETRIEVAL TAB ========== */}
        <TabsContent value="retrieval" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">Retrieval Settings</h2>
              <p className="text-sm text-muted-foreground">Configuration for document retrieval</p>
            </div>
            <Button variant="outline" size="sm" onClick={resetRetrievalSettings}>
              <ArrowsClockwise className="size-4 mr-2" />
              Reset
            </Button>
          </div>

          <div className="grid gap-6">
            {/* Top K */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Top K (Final Results)</Label>
                <Badge variant="secondary" className="tabular-nums">
                  {settings.retrieval.topK}
                </Badge>
              </div>
              <Slider
                value={[settings.retrieval.topK]}
                onValueChange={([value]) => updateRetrievalSettings({ topK: value })}
                min={1}
                max={20}
                step={1}
              />
              <p className="text-xs text-muted-foreground">Number of chunks to return after reranking</p>
            </div>

            {/* Minimum Similarity Score */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Minimum Similarity Score</Label>
                <Badge variant="secondary" className="tabular-nums">
                  {(backendConfig.minSimilarityScore * 100).toFixed(0)}%
                </Badge>
              </div>
              <Slider
                value={[backendConfig.minSimilarityScore]}
                onValueChange={([value]) => setBackendConfig({ ...backendConfig, minSimilarityScore: value })}
                min={0}
                max={1}
                step={0.05}
              />
              <p className="text-xs text-muted-foreground">Chunks below this threshold will be filtered out</p>
            </div>

            {/* Core Retrieval Options */}
            <div className="space-y-4 p-5 rounded-xl border bg-card/50">
              <h4 className="text-sm font-medium">Core Options</h4>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Hybrid Search</Label>
                  <p className="text-xs text-muted-foreground">Combine vector search with BM25 keyword matching</p>
                </div>
                <Switch
                  checked={settings.retrieval.hybridSearch}
                  onCheckedChange={(checked) => updateRetrievalSettings({ hybridSearch: checked })}
                />
              </div>

              {settings.retrieval.hybridSearch && (
                <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Hybrid Alpha (Vector Weight)</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{extendedRetrieval.hybridAlpha.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[extendedRetrieval.hybridAlpha]}
                    onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, hybridAlpha: value })}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Weight for vector search (1-alpha for BM25). Higher = more semantic.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Reranking</Label>
                  <p className="text-xs text-muted-foreground">Re-score results with cross-encoder model</p>
                </div>
                <Switch
                  checked={settings.retrieval.useReranking}
                  onCheckedChange={(checked) => updateRetrievalSettings({ useReranking: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Debug Info</Label>
                  <p className="text-xs text-muted-foreground">Display scores, latency, and strategy details</p>
                </div>
                <Switch
                  checked={settings.retrieval.showDebugInfo}
                  onCheckedChange={(checked) => updateRetrievalSettings({ showDebugInfo: checked })}
                />
              </div>
            </div>

            {/* Multi-Query */}
            <div className="space-y-4 p-5 rounded-xl border bg-card/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <ListMagnifyingGlass className="size-5" weight="duotone" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="enableMultiQuery" className="font-medium cursor-pointer">Multi-Query</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Generates multiple variations of your question to catch relevant documents.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Query expansion & variations</p>
                  </div>
                </div>
                <Switch
                  id="enableMultiQuery"
                  checked={settings.retrieval.strategy === "multi-query"}
                  onCheckedChange={(checked) => updateRetrievalSettings({ strategy: checked ? "multi-query" : "basic" })}
                />
              </div>

              {settings.retrieval.strategy === "multi-query" && (
                <div className="pl-11 space-y-3 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Variations Count</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{settings.retrieval.numQueryVariations}</span>
                  </div>
                  <Slider
                    value={[settings.retrieval.numQueryVariations]}
                    onValueChange={([value]) => updateRetrievalSettings({ numQueryVariations: value })}
                    min={2}
                    max={5}
                    step={1}
                  />
                </div>
              )}
            </div>

            {/* HyDE */}
            <div className="space-y-4 p-5 rounded-xl border bg-card/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                    <MagicWand className="size-5" weight="duotone" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="enableHyDE" className="font-medium cursor-pointer">HyDE</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Hypothetical Document Embeddings - generates hypothetical answers to improve search.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Hypothetical Document Embeddings</p>
                  </div>
                </div>
                <Switch
                  id="enableHyDE"
                  checked={settings.retrieval.strategy === "hyde"}
                  onCheckedChange={(checked) => updateRetrievalSettings({ strategy: checked ? "hyde" : "basic" })}
                />
              </div>

              {settings.retrieval.strategy === "hyde" && (
                <div className="pl-11 space-y-5 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Fusion Method</Label>
                    <Select
                      value={settings.retrieval.hydeFusion}
                      onValueChange={(value: "average" | "max" | "rrf") => updateRetrievalSettings({ hydeFusion: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rrf">RRF (Reciprocal Rank Fusion)</SelectItem>
                        <SelectItem value="average">Average Scores</SelectItem>
                        <SelectItem value="max">Maximum Score</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Hypotheses Count</Label>
                      <span className="text-xs text-muted-foreground tabular-nums">{settings.retrieval.numHypotheticalDocs}</span>
                    </div>
                    <Slider
                      value={[settings.retrieval.numHypotheticalDocs]}
                      onValueChange={([value]) => updateRetrievalSettings({ numHypotheticalDocs: value })}
                      min={1}
                      max={5}
                      step={1}
                    />
                  </div>

                  {/* Nouveau: Toggle Multilingual HyDE */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="useMultilingualHyDE" className="text-xs font-medium cursor-pointer">
                        Multilingual HyDE
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Generate docs in query language</p>
                    </div>
                    <Switch
                      id="useMultilingualHyDE"
                      checked={settings.retrieval.useMultilingualHyDE}
                      onCheckedChange={(checked) => updateRetrievalSettings({ useMultilingualHyDE: checked })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Graph RAG */}
            <div className="space-y-4 p-5 rounded-xl border bg-card/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Graph className="size-5" weight="duotone" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="enableGraphRAG" className="font-medium cursor-pointer">Graph RAG</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Expands retrieval through entity/relation graph for connected knowledge.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Graph-augmented retrieval</p>
                  </div>
                </div>
                <Switch
                  id="enableGraphRAG"
                  checked={aiSettings.enableGraphRAG}
                  onCheckedChange={setEnableGraphRAG}
                />
              </div>

              {aiSettings.enableGraphRAG && (
                <div className="pl-11 space-y-5 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Expansion Depth</Label>
                      <span className="text-xs text-muted-foreground tabular-nums">{aiSettings.graphExpansionDepth}</span>
                    </div>
                    <Slider
                      value={[aiSettings.graphExpansionDepth]}
                      onValueChange={([value]) => setGraphExpansionDepth(value)}
                      min={1}
                      max={3}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">Hops to traverse in the graph</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Graph Alpha</Label>
                      <span className="text-xs text-muted-foreground tabular-nums">{aiSettings.graphAlpha.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[aiSettings.graphAlpha]}
                      onValueChange={([value]) => setGraphAlpha(value)}
                      min={0}
                      max={1}
                      step={0.05}
                    />
                    <p className="text-xs text-muted-foreground">Weight of vector vs graph scores (higher = more vector)</p>
                  </div>
                </div>
              )}
            </div>

            {/* MMR Diversity */}
            <div className="space-y-4 p-5 rounded-xl border bg-card/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Stack className="size-5" weight="duotone" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="enableMMR" className="font-medium cursor-pointer">MMR Diversity</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Maximal Marginal Relevance — reduces redundancy across retrieved chunks.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Penalize near-duplicate chunks</p>
                  </div>
                </div>
                <Switch
                  id="enableMMR"
                  checked={aiSettings.enableMMR}
                  onCheckedChange={setEnableMMR}
                />
              </div>

              {aiSettings.enableMMR && (
                <div className="pl-11 space-y-3 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Lambda</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{aiSettings.mmrLambda.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[aiSettings.mmrLambda]}
                    onValueChange={([value]) => setMmrLambda(value)}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">1 = relevance only, 0 = diversity only</p>
                </div>
              )}
            </div>

            {/* Multi-Hop */}
            <div className="space-y-4 p-5 rounded-xl border bg-card/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="size-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <TrendUp className="size-5" weight="duotone" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="enableMultiHop" className="font-medium cursor-pointer">Multi-Hop</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Chains multiple retrieval rounds for complex, multi-step questions.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Iterative reasoning retrieval</p>
                  </div>
                </div>
                <Switch
                  id="enableMultiHop"
                  checked={aiSettings.enableMultiHop}
                  onCheckedChange={setEnableMultiHop}
                />
              </div>

              {aiSettings.enableMultiHop && (
                <div className="pl-11 space-y-3 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Max Hops</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{aiSettings.maxHops}</span>
                  </div>
                  <Slider
                    value={[aiSettings.maxHops]}
                    onValueChange={([value]) => setMaxHops(value)}
                    min={1}
                    max={5}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">Upper bound on reasoning rounds</p>
                </div>
              )}
            </div>

            {/* Language Override (Optional) */}
            <div className="space-y-3 p-4 rounded-lg border bg-card/30">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Translate className="size-4" weight="duotone" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Query Language</Label>
                  <p className="text-xs text-muted-foreground">Override automatic language detection</p>
                </div>
              </div>
              <Select
                value={settings.retrieval.queryLanguage || "auto"}
                onValueChange={(value) => updateRetrievalSettings({ queryLanguage: value === "auto" ? null : value })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect (Recommended)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="he">Hebrew</SelectItem>
                  <SelectItem value="tr">Turkish</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Multilingual Features Info */}
            <div className="pt-4 border-t">
              <div className="flex gap-3 items-start p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                <Info className="size-4 shrink-0 mt-0.5" />
                <p>Multilingual features are automatically enabled: multilingual embeddings (multilingual-e5-large), BM25, language detection, and classification. These provide optimal multilingual support without manual configuration.</p>
              </div>
            </div>

            {/* Advanced Retrieval Options */}
            <Collapsible open={advancedRetrievalOpen} onOpenChange={setAdvancedRetrievalOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <GearSix className="size-4" />
                    Advanced Retrieval Options
                  </span>
                  <CaretDown
                    className={cn(
                      "size-4 transition-transform",
                      advancedRetrievalOpen && "transform rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4 mt-4">
                {/* Two-Stage Retrieval */}
                <div className="space-y-4 p-5 rounded-xl border bg-card/50">
                  <h4 className="text-sm font-medium">Two-Stage Retrieval</h4>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Initial Retrieval K</Label>
                      <Badge variant="secondary" className="tabular-nums text-[10px]">
                        {extendedRetrieval.initialRetrievalK}
                      </Badge>
                    </div>
                    <Slider
                      value={[extendedRetrieval.initialRetrievalK]}
                      onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, initialRetrievalK: value })}
                      min={10}
                      max={200}
                      step={10}
                    />
                    <p className="text-xs text-muted-foreground">Initial candidates before reranking</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Reranker Top K</Label>
                      <Badge variant="secondary" className="tabular-nums text-[10px]">
                        {extendedRetrieval.rerankerTopK}
                      </Badge>
                    </div>
                    <Slider
                      value={[extendedRetrieval.rerankerTopK]}
                      onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, rerankerTopK: value })}
                      min={5}
                      max={50}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">How many to keep after reranking</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Dedup Similarity Threshold</Label>
                      <Badge variant="secondary" className="tabular-nums text-[10px]">
                        {(extendedRetrieval.dedupSimilarityThreshold * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <Slider
                      value={[extendedRetrieval.dedupSimilarityThreshold]}
                      onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, dedupSimilarityThreshold: value })}
                      min={0.7}
                      max={1}
                      step={0.05}
                    />
                    <p className="text-xs text-muted-foreground">Cosine similarity threshold for deduplication</p>
                  </div>
                </div>

                {/* Score Normalization */}
                <div className="space-y-4 p-5 rounded-xl border bg-card/50">
                  <h4 className="text-sm font-medium">Score Normalization</h4>

                  <div className="space-y-2">
                    <Label className="text-xs">Method</Label>
                    <Select
                      value={extendedRetrieval.scoreNormalizationMethod}
                      onValueChange={(value: "minmax" | "zscore" | "rrf") =>
                        setExtendedRetrieval({ ...extendedRetrieval, scoreNormalizationMethod: value })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minmax">MinMax (scale to [0,1])</SelectItem>
                        <SelectItem value="zscore">Z-Score (standardize)</SelectItem>
                        <SelectItem value="rrf">RRF (Reciprocal Rank Fusion)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {extendedRetrieval.scoreNormalizationMethod === "rrf" && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs">RRF K Constant</Label>
                        <Badge variant="secondary" className="tabular-nums text-[10px]">
                          {extendedRetrieval.rrfK}
                        </Badge>
                      </div>
                      <Slider
                        value={[extendedRetrieval.rrfK]}
                        onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, rrfK: value })}
                        min={1}
                        max={100}
                        step={1}
                      />
                      <p className="text-xs text-muted-foreground">Constant for RRF formula (default: 60)</p>
                    </div>
                  )}
                </div>

                {/* Context Compression Advanced */}
                <div className="space-y-4 p-5 rounded-xl border bg-card/50">
                  <h4 className="text-sm font-medium">Context Compression</h4>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Max Context Tokens</Label>
                      <Badge variant="secondary" className="tabular-nums text-[10px]">
                        {extendedRetrieval.maxContextTokens}
                      </Badge>
                    </div>
                    <Slider
                      value={[extendedRetrieval.maxContextTokens]}
                      onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, maxContextTokens: value })}
                      min={1000}
                      max={8000}
                      step={500}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Compression Ratio</Label>
                      <Badge variant="secondary" className="tabular-nums text-[10px]">
                        {(extendedRetrieval.compressionRatio * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <Slider
                      value={[extendedRetrieval.compressionRatio]}
                      onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, compressionRatio: value })}
                      min={0.3}
                      max={1}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">Percentage of context to keep</p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </TabsContent>

        {/* ========== LLM & PROMPT TAB ========== */}
        <TabsContent value="llm" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">LLM & Prompt Configuration</h2>
              <p className="text-sm text-muted-foreground">Generation model and custom system prompt</p>
            </div>
            <Button variant="outline" size="sm" onClick={resetLLMSettings}>
              <ArrowsClockwise className="size-4 mr-2" />
              Reset
            </Button>
          </div>

          <div className="grid gap-6">
            {/* Connection Test */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <Label className="text-sm font-medium">Ollama Connection</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={isTestingConnection}>
                  {isTestingConnection ? (
                    <CircleNotch className="size-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="size-4 mr-2" />
                  )}
                  Test Connection
                </Button>

                {connectionStatus === "success" && (
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <CheckCircle className="size-4" weight="fill" />
                    <span className="text-xs font-medium">Connected</span>
                  </div>
                )}

                {connectionStatus === "error" && (
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                    <XCircle className="size-4" weight="fill" />
                    <span className="text-xs font-medium">Failed</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">URL: http://localhost:11434</p>
            </div>

            {/* Model Selection */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <Label className="text-sm font-medium">LLM Model</Label>
              <Select
                value={settings.llm.model}
                onValueChange={(value) => updateLLMSettings({ model: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {llmModels.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      No models found. Start Ollama.
                    </div>
                  ) : (
                    llmModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Model used for generating responses from retrieved context
              </p>
            </div>

            {/* Temperature */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Temperature</Label>
                <Badge variant="secondary" className="tabular-nums">
                  {settings.llm.temperature.toFixed(2)}
                </Badge>
              </div>
              <Slider
                value={[settings.llm.temperature]}
                onValueChange={([value]) => updateLLMSettings({ temperature: value })}
                min={0}
                max={1}
                step={0.05}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Precise (0.0)</span>
                <span>Creative (1.0)</span>
              </div>
            </div>

            {/* Response Length */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <Label className="text-sm font-medium">Response Length</Label>
              <div className="grid grid-cols-3 gap-3">
                {responseLengthOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      updateLLMSettings({
                        responseLength: option.value,
                        maxTokens: maxTokensForLength[option.value],
                      })
                    }
                    className={cn(
                      "p-3 rounded-lg border text-center transition-all hover:border-primary/50",
                      settings.llm.responseLength === option.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "bg-card"
                    )}
                  >
                    <div className="font-medium text-sm mb-1">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.desc}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Max tokens: {settings.llm.maxTokens.toLocaleString()}</p>
            </div>

            {/* Custom System Prompt */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Custom System Prompt</Label>
                <Badge variant="outline" className="text-[10px]">
                  Optional
                </Badge>
              </div>
              <Textarea
                value={settings.llm.systemPrompt}
                onChange={(e) => updateLLMSettings({ systemPrompt: e.target.value })}
                placeholder="Enter a custom system prompt for RAG responses (leave empty for default)"
                className="min-h-[200px] font-mono text-xs"
              />
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  This prompt will be used for ALL RAG responses. Leave empty for default behavior.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ========== BACKEND CONFIG TAB ========== */}
        <TabsContent value="backend" className="space-y-6 mt-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Backend System Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Advanced backend settings (requires backend restart to apply)
            </p>
          </div>

          <div className="grid gap-6">
            {/* Vector Store */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <Label className="text-sm font-medium">Vector Store Type</Label>
              <Select
                value={backendConfig.vectorStoreType}
                onValueChange={(value: "lancedb" | "faiss" | "chroma" | "sqlite") =>
                  setBackendConfig({ ...backendConfig, vectorStoreType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sqlite">SQLite (recommended for small-medium)</SelectItem>
                  <SelectItem value="lancedb">LanceDB (fast, serverless)</SelectItem>
                  <SelectItem value="faiss">FAISS (fastest, in-memory)</SelectItem>
                  <SelectItem value="chroma">ChromaDB (requires server)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Backend for storing vector embeddings
              </p>
            </div>

            {/* Embedding Device */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <Label className="text-sm font-medium">Embedding Device</Label>
              <Select
                value={backendConfig.embeddingDevice}
                onValueChange={(value: "cuda" | "cpu") =>
                  setBackendConfig({ ...backendConfig, embeddingDevice: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cuda">CUDA (GPU - fast)</SelectItem>
                  <SelectItem value="cpu">CPU (slower, no GPU required)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Embedding Batch Size */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Embedding Batch Size</Label>
                <Badge variant="secondary" className="tabular-nums">
                  {backendConfig.embeddingBatchSize}
                </Badge>
              </div>
              <Slider
                value={[backendConfig.embeddingBatchSize]}
                onValueChange={([value]) => setBackendConfig({ ...backendConfig, embeddingBatchSize: value })}
                min={8}
                max={512}
                step={8}
              />
              <p className="text-xs text-muted-foreground">
                Higher = faster processing but more GPU memory (256 for 16GB GPU, 64 for 6GB GPU)
              </p>
            </div>

            {/* GPU Memory Fraction */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">GPU Memory Fraction</Label>
                <Badge variant="secondary" className="tabular-nums">
                  {(backendConfig.gpuMemoryFraction * 100).toFixed(0)}%
                </Badge>
              </div>
              <Slider
                value={[backendConfig.gpuMemoryFraction]}
                onValueChange={([value]) => setBackendConfig({ ...backendConfig, gpuMemoryFraction: value })}
                min={0.5}
                max={0.99}
                step={0.05}
              />
              <p className="text-xs text-muted-foreground">
                Percentage of GPU memory to allocate for embeddings
              </p>
            </div>

            {/* Max Workers */}
            <div className="space-y-3 p-5 rounded-xl border bg-card/50">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Max Workers</Label>
                <Badge variant="secondary" className="tabular-nums">
                  {backendConfig.maxWorkers}
                </Badge>
              </div>
              <Slider
                value={[backendConfig.maxWorkers]}
                onValueChange={([value]) => setBackendConfig({ ...backendConfig, maxWorkers: value })}
                min={1}
                max={32}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Number of parallel workers for processing
              </p>
            </div>

            {/* Advanced Features */}
            <div className="space-y-4 p-5 rounded-xl border bg-card/50">
              <h4 className="text-sm font-medium">Advanced Features</h4>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Normalize Embeddings</Label>
                  <p className="text-xs text-muted-foreground">L2 normalize embedding vectors</p>
                </div>
                <Switch
                  checked={backendConfig.normalizeEmbeddings}
                  onCheckedChange={(checked) => setBackendConfig({ ...backendConfig, normalizeEmbeddings: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Contextual Embeddings</Label>
                  <p className="text-xs text-muted-foreground">Add document context to chunk embeddings</p>
                </div>
                <Switch
                  checked={backendConfig.useContextualEmbeddings}
                  onCheckedChange={(checked) => setBackendConfig({ ...backendConfig, useContextualEmbeddings: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Query Logging</Label>
                  <p className="text-xs text-muted-foreground">Log all queries for analytics</p>
                </div>
                <Switch
                  checked={backendConfig.enableQueryLogging}
                  onCheckedChange={(checked) => setBackendConfig({ ...backendConfig, enableQueryLogging: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Router Mode</Label>
                <Select
                  value={backendConfig.routerMode}
                  onValueChange={(value: "rules" | "llm") =>
                    setBackendConfig({ ...backendConfig, routerMode: value })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rules">Rules-Based (fast, deterministic)</SelectItem>
                    <SelectItem value="llm">LLM-Based (smart, adaptive)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Method for auto-routing queries to optimal strategy
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <Info className="size-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div className="text-xs text-orange-800 dark:text-orange-300">
                <p className="font-semibold mb-1">Backend Configuration Notice</p>
                <p>
                  These settings control the backend RAG server. Changes require restarting the backend service to take effect.
                  Edit <code className="bg-orange-100 dark:bg-orange-900 px-1 py-0.5 rounded">backend/.env</code> or <code className="bg-orange-100 dark:bg-orange-900 px-1 py-0.5 rounded">backend/config/settings.py</code> for persistent configuration.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ========== STATISTICS TAB ========== */}
        <TabsContent value="statistics" className="space-y-6 mt-6">
          <StatsDashboard />
        </TabsContent>
      </Tabs>

      {/* Edit Collection Dialog */}
      {editingCollectionId && (
        <DialogEditCollection
          isOpen={!!editingCollectionId}
          setIsOpen={(open) => !open && setEditingCollectionId(null)}
          collectionId={editingCollectionId}
          onUpdated={fetchCollections}
        />
      )}

      {/* Visualize Collection Dialog */}
      {visualizingCollectionId && (
        <DialogVisualizeCollection
          isOpen={!!visualizingCollectionId}
          setIsOpen={(open) => !open && setVisualizingCollectionId(null)}
          collectionId={visualizingCollectionId}
        />
      )}
    </div>
  )
}
