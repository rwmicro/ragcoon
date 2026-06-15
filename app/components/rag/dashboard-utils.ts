/**
 * Pure, framework-agnostic helpers for the RAG dashboard.
 *
 * Everything here is deliberately free of React / DOM so it can be unit-tested
 * in a plain Node environment (see __tests__/dashboard-utils.test.ts).
 */
import type { ResponseLength } from "@/lib/rag-settings-store"

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface FileUploadItem {
  file: File
  id: string
  status: "pending" | "uploading" | "success" | "error"
  progress: number
  error?: string
  type: "file" | "url"
  url?: string
}

/** Backend system configuration mirrored from the Python service. */
export interface BackendConfig {
  vectorStoreType: "lancedb" | "faiss" | "chroma" | "sqlite"
  embeddingDevice: "cuda" | "cpu"
  embeddingBatchSize: number
  normalizeEmbeddings: boolean
  maxWorkers: number
  gpuMemoryFraction: number
  useContextualEmbeddings: boolean
  enableQueryLogging: boolean
  routerMode: "rules" | "llm"
  minSimilarityScore: number
}

export interface ExtendedRetrievalSettings {
  initialRetrievalK: number
  dedupSimilarityThreshold: number
  hybridAlpha: number
  scoreNormalizationMethod: "minmax" | "zscore" | "rrf"
  rrfK: number
  rerankerTopK: number
  maxContextTokens: number
  compressionRatio: number
}

export interface ExtendedIngestionSettings {
  minChunkSize: number
  maxChunkSize: number
  embeddingProvider: "ollama" | "huggingface" | "auto"
  rerankerModel: string
}

export type ChunkingStrategy = "semantic" | "recursive" | "markdown"

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_EXTENDED_RETRIEVAL: ExtendedRetrievalSettings = {
  initialRetrievalK: 50,
  dedupSimilarityThreshold: 0.9,
  hybridAlpha: 0.7,
  scoreNormalizationMethod: "minmax",
  rrfK: 60,
  rerankerTopK: 10,
  maxContextTokens: 4000,
  compressionRatio: 0.6,
}

export const DEFAULT_EXTENDED_INGESTION: ExtendedIngestionSettings = {
  minChunkSize: 100,
  maxChunkSize: 2000,
  embeddingProvider: "auto",
  rerankerModel: "BAAI/bge-reranker-large",
}

export const DEFAULT_BACKEND_CONFIG: BackendConfig = {
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
}

// ─── LLM response-length presets ──────────────────────────────────────────────

export const RESPONSE_LENGTH_OPTIONS: {
  value: ResponseLength
  label: string
  desc: string
}[] = [
  { value: "concise", label: "Concise", desc: "Short answers" },
  { value: "balanced", label: "Balanced", desc: "Moderate detail" },
  { value: "detailed", label: "Detailed", desc: "Comprehensive" },
]

export const MAX_TOKENS_FOR_LENGTH: Record<ResponseLength, number> = {
  concise: 512,
  balanced: 2048,
  detailed: 4096,
}

// ─── File handling ────────────────────────────────────────────────────────────

/** File extensions accepted when ingesting a folder. */
export const SUPPORTED_FOLDER_EXTENSIONS = [
  ".pdf",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
] as const

/** Whether a folder-dropped file has a supported extension. */
export function isSupportedFolderFile(fileName: string): boolean {
  const name = fileName.toLowerCase()
  return SUPPORTED_FOLDER_EXTENSIONS.some((ext) => name.endsWith(ext))
}

/** Stable-ish short id for an upload-queue item. */
export function createUploadItemId(): string {
  return Math.random().toString(36).substring(7)
}

/** Wrap files into pending upload-queue items. */
export function createFileUploadItems(files: File[]): FileUploadItem[] {
  return files.map((file) => ({
    file,
    id: createUploadItemId(),
    status: "pending",
    progress: 0,
    type: "file",
  }))
}

/** Build a pending upload-queue item for a URL. */
export function createUrlUploadItem(url: string): FileUploadItem {
  return {
    file: new File([], url),
    id: createUploadItemId(),
    status: "pending",
    progress: 0,
    type: "url",
    url,
  }
}

/**
 * The backend doesn't support the "smart" chunking strategy used by the UI —
 * fall back to "semantic". Any of the supported strategies pass through.
 */
export function resolveChunkingStrategy(strategy: string): ChunkingStrategy {
  return strategy === "smart" ? "semantic" : (strategy as ChunkingStrategy)
}

// ─── Backend env-config mapping ───────────────────────────────────────────────

/** Loosely-typed shape of the backend `/config/env` payload. */
export interface EnvConfig {
  vector_store?: Record<string, unknown>
  embedding?: Record<string, unknown>
  retrieval?: Record<string, unknown>
  reranking?: Record<string, unknown>
  compression?: Record<string, unknown>
  other?: Record<string, unknown>
}

const num = (value: unknown, fallback: number): number =>
  value === undefined || value === null ? fallback : Number(value)

const bool = (value: unknown, fallback: boolean): boolean =>
  value === undefined || value === null ? fallback : Boolean(value)

/**
 * Map a backend env-config payload onto the dashboard's extended settings,
 * keeping the current value as a fallback for anything the backend omits.
 */
export function mapEnvConfigToExtended(
  config: EnvConfig,
  current: {
    retrieval: ExtendedRetrievalSettings
    ingestion: ExtendedIngestionSettings
    backend: BackendConfig
  }
): {
  retrieval: ExtendedRetrievalSettings
  ingestion: ExtendedIngestionSettings
  backend: BackendConfig
} {
  const { retrieval, ingestion, backend } = current

  return {
    retrieval: {
      initialRetrievalK: num(config.other?.INITIAL_RETRIEVAL_K, retrieval.initialRetrievalK),
      dedupSimilarityThreshold: num(
        config.other?.DEDUP_SIMILARITY_THRESHOLD,
        retrieval.dedupSimilarityThreshold
      ),
      hybridAlpha: num(config.retrieval?.HYBRID_ALPHA, retrieval.hybridAlpha),
      scoreNormalizationMethod:
        (config.other?.SCORE_NORMALIZATION_METHOD as ExtendedRetrievalSettings["scoreNormalizationMethod"]) ??
        retrieval.scoreNormalizationMethod,
      rrfK: num(config.other?.RRF_K, retrieval.rrfK),
      rerankerTopK: num(config.reranking?.RERANKER_TOP_K, retrieval.rerankerTopK),
      maxContextTokens: num(config.compression?.MAX_CONTEXT_TOKENS, retrieval.maxContextTokens),
      compressionRatio: num(config.compression?.COMPRESSION_RATIO, retrieval.compressionRatio),
    },
    ingestion: {
      ...ingestion,
      minChunkSize: num(config.other?.MIN_CHUNK_SIZE, ingestion.minChunkSize),
      maxChunkSize: num(config.other?.MAX_CHUNK_SIZE, ingestion.maxChunkSize),
      rerankerModel:
        (config.reranking?.RERANKER_MODEL as string) ?? ingestion.rerankerModel,
    },
    backend: {
      ...backend,
      vectorStoreType:
        (config.vector_store?.VECTOR_STORE_TYPE as BackendConfig["vectorStoreType"]) ??
        backend.vectorStoreType,
      embeddingDevice:
        (config.embedding?.EMBEDDING_DEVICE as BackendConfig["embeddingDevice"]) ??
        backend.embeddingDevice,
      embeddingBatchSize: num(config.embedding?.EMBEDDING_BATCH_SIZE, backend.embeddingBatchSize),
      normalizeEmbeddings: bool(config.embedding?.NORMALIZE_EMBEDDINGS, backend.normalizeEmbeddings),
      maxWorkers: num(config.other?.MAX_WORKERS, backend.maxWorkers),
      gpuMemoryFraction: num(config.other?.GPU_MEMORY_FRACTION, backend.gpuMemoryFraction),
      useContextualEmbeddings: bool(
        config.other?.USE_CONTEXTUAL_EMBEDDINGS,
        backend.useContextualEmbeddings
      ),
      enableQueryLogging: bool(config.other?.ENABLE_QUERY_LOGGING, backend.enableQueryLogging),
      routerMode:
        (config.other?.ROUTER_MODE as BackendConfig["routerMode"]) ?? backend.routerMode,
      minSimilarityScore: num(config.retrieval?.MIN_SIMILARITY_SCORE, backend.minSimilarityScore),
    },
  }
}
