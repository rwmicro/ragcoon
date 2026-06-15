/**
 * RAG API Client
 * Connects frontend to Python RAG backend
 */

const RAG_API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8001"

export interface UploadFileRequest {
  file: File
  collection_id?: string
  collection_title?: string
  llm_model?: string
  chunk_size?: number
  chunk_overlap?: number
  chunking_strategy?: "semantic" | "recursive" | "markdown"
  embedding_model?: string
  embedding_provider?: "ollama" | "huggingface" | "auto"
  use_ollama_embedding?: boolean
  use_hybrid_embedding?: boolean
  use_adaptive_fusion?: boolean
  structural_weight?: number
  reranker_model?: string
}

export interface UploadFileResponse {
  success: boolean
  message: string
  stats: {
    filename: string
    num_chunks: number
    doc_type: string
    embedding_model: string
  }
}

export interface RAGStats {
  total_chunks: number
  total_files: number
  embedding_model: string
  llm_model?: string
  vector_store_type: string
  cache_stats: Record<string, any>
}

/**
 * Shared ingestion options common to file / URL / async ingestion endpoints.
 */
type IngestOptions = Partial<{
  collection_id: string
  collection_title: string
  llm_model: string
  chunk_size: number
  chunk_overlap: number
  chunking_strategy: "semantic" | "recursive" | "markdown"
  embedding_model: string
  embedding_provider: "ollama" | "huggingface" | "auto"
  use_ollama_embedding: boolean
  use_hybrid_embedding: boolean
  use_adaptive_fusion: boolean
  structural_weight: number
  reranker_model: string
}>

/**
 * Append the shared ingestion options to a FormData payload. Only defined
 * values are appended; booleans/numbers are stringified. Note the backend
 * expects `embedding_model` to be sent as `embedding_model_name`.
 */
function appendIngestOptions(formData: FormData, opts: IngestOptions): void {
  const append = (key: string, value: string | number | boolean | undefined) => {
    if (value !== undefined) formData.append(key, String(value))
  }

  append("collection_id", opts.collection_id)
  append("collection_title", opts.collection_title)
  append("llm_model", opts.llm_model)
  append("chunk_size", opts.chunk_size)
  append("chunk_overlap", opts.chunk_overlap)
  append("chunking_strategy", opts.chunking_strategy)
  append("embedding_model_name", opts.embedding_model)
  append("embedding_provider", opts.embedding_provider)
  append("use_ollama_embedding", opts.use_ollama_embedding)
  append("use_hybrid_embedding", opts.use_hybrid_embedding)
  append("use_adaptive_fusion", opts.use_adaptive_fusion)
  append("structural_weight", opts.structural_weight)
  append("reranker_model", opts.reranker_model)
}

/**
 * Upload and ingest a file into the RAG system
 */
export async function uploadFile(request: UploadFileRequest): Promise<UploadFileResponse> {
  const formData = new FormData()
  formData.append("file", request.file)
  appendIngestOptions(formData, request)

  const response = await fetch(`${RAG_API_URL}/ingest/file`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Upload failed: ${error}`)
  }
  return response.json()
}

export interface IngestUrlRequest {
  url: string
  collection_id?: string
  collection_title: string
  llm_model?: string
  chunk_size?: number
  chunk_overlap?: number
  chunking_strategy?: "semantic" | "recursive" | "markdown"
  embedding_model?: string
  embedding_provider?: "ollama" | "huggingface" | "auto"
  use_ollama_embedding?: boolean
  use_hybrid_embedding?: boolean
  use_adaptive_fusion?: boolean
  structural_weight?: number
  reranker_model?: string
}

/**
 * Ingest content from a URL
 */
export async function ingestUrl(request: IngestUrlRequest): Promise<UploadFileResponse> {
  const formData = new FormData()
  formData.append("url", request.url)
  appendIngestOptions(formData, request)

  const response = await fetch(`${RAG_API_URL}/ingest/url`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`URL ingestion failed: ${error}`)
  }

  return response.json()
}

/**
 * Get RAG system statistics
 */
export async function getRAGStats(): Promise<RAGStats> {
  const response = await fetch(`${RAG_API_URL}/stats`)

  if (!response.ok) {
    throw new Error(`Failed to get stats: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Clear all caches
 */
export async function clearCache(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${RAG_API_URL}/cache`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error(`Failed to clear cache: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Ingest directory (all files in backend/data/corpus/)
 */
export interface IngestFolderRequest {
  folder_path: string
  collection_title: string
  collection_id?: string
  recursive?: boolean
  chunk_size?: number
  chunk_overlap?: number
  chunking_strategy?: "semantic" | "recursive" | "markdown"
}

export async function ingestFolder(
  request: IngestFolderRequest
): Promise<{ job_id: string; status: string }> {
  const response = await fetch(`${RAG_API_URL}/ingest/folder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder_path: request.folder_path,
      collection_title: request.collection_title,
      collection_id: request.collection_id,
      recursive: request.recursive ?? true,
      chunk_size: request.chunk_size ?? 1000,
      chunk_overlap: request.chunk_overlap ?? 200,
      chunking_strategy: request.chunking_strategy ?? "semantic",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Folder ingestion failed: ${error}`)
  }

  return response.json()
}

// ─── Async ingestion ────────────────────────────────────────────────────────

export interface AsyncIngestionJob {
  job_id: string
  status: "queued" | "processing" | "completed" | "failed"
  progress: number          // 0.0 – 1.0
  result?: {
    num_chunks: number
    collection_id?: string
  }
  error?: string
  created_at?: string
  updated_at?: string
}

/**
 * Upload a file using the async ingestion endpoint.
 * Returns a job_id that can be polled with getIngestionJob().
 */
export async function uploadFileAsync(
  request: UploadFileRequest
): Promise<AsyncIngestionJob> {
  const formData = new FormData()
  formData.append("file", request.file)
  appendIngestOptions(formData, request)

  const response = await fetch(`${RAG_API_URL}/ingest/file/async`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Async upload failed: ${error}`)
  }

  return response.json()
}

/**
 * Poll the status of an async ingestion job.
 */
export async function getIngestionJob(jobId: string): Promise<AsyncIngestionJob> {
  const response = await fetch(`${RAG_API_URL}/ingest/jobs/${encodeURIComponent(jobId)}`)

  if (!response.ok) {
    throw new Error(`Failed to get job status: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Poll an async ingestion job until it completes or fails.
 * Calls onProgress with each status update (progress 0.0–1.0).
 */
export async function waitForIngestionJob(
  jobId: string,
  onProgress?: (job: AsyncIngestionJob) => void,
  intervalMs = 1500,
  timeoutMs = 5 * 60 * 1000
): Promise<AsyncIngestionJob> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const job = await getIngestionJob(jobId)
    onProgress?.(job)

    if (job.status === "completed" || job.status === "failed") {
      return job
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Ingestion job ${jobId} timed out after ${timeoutMs / 1000}s`)
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${RAG_API_URL}/`)

  if (!response.ok) {
    throw new Error("Backend not responding")
  }

  return response.json()
}

/**
 * File metadata within a collection
 */
export interface FileMetadata {
  size: number
  chunks: number
  uploaded_at: string
}

/**
 * List all RAG collections
 */
export interface RAGCollection {
  id: string
  title: string
  llm_model: string
  embedding_model: string
  file_count: number
  chunk_count: number
  created_at: string
  files: string[]
  file_metadata?: Record<string, FileMetadata>  // filename -> metadata
}

export async function listCollections(): Promise<{ collections: RAGCollection[]; total: number }> {
  const response = await fetch(`${RAG_API_URL}/collections`)

  if (!response.ok) {
    throw new Error(`Failed to list collections: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a specific RAG collection
 */
export async function getCollection(collectionId: string): Promise<RAGCollection> {
  const response = await fetch(`${RAG_API_URL}/collections/${collectionId}`)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get collection: ${error}`)
  }

  return response.json()
}

/**
 * Update a RAG collection's configuration
 */
export interface UpdateCollectionRequest {
  title?: string
  llmModel?: string
  embeddingModel?: string
}

export async function updateCollection(
  collectionId: string,
  request: UpdateCollectionRequest
): Promise<{ success: boolean; message: string; collection: RAGCollection }> {
  const params = new URLSearchParams()
  if (request.title) {
    params.append("title", request.title)
  }
  if (request.llmModel) {
    params.append("llm_model", request.llmModel)
  }
  if (request.embeddingModel) {
    params.append("embedding_model", request.embeddingModel)
  }

  const response = await fetch(`${RAG_API_URL}/collections/${collectionId}?${params}`, {
    method: "PATCH",
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update collection: ${error}`)
  }

  return response.json()
}

/**
 * Rename a RAG collection
 */
export async function renameCollection(collectionId: string, newTitle: string): Promise<{ success: boolean; message: string; collection: RAGCollection }> {
  return updateCollection(collectionId, { title: newTitle })
}

/**
 * Delete a RAG collection
 */
export async function deleteCollection(collectionId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${RAG_API_URL}/collections/${collectionId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete collection: ${error}`)
  }

  return response.json()
}


/**
 * Delete a document from a collection
 */
export async function deleteDocument(collectionId: string, filename: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${RAG_API_URL}/collections/${collectionId}/documents/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete document: ${error}`)
  }

  return response.json()
}

/**
 * RAG Query Types
 */
export interface RAGQueryRequest {
  query: string
  collection_id: string
  conversation_history?: Array<{ role: string; content: string }>
  top_k?: number
  use_hybrid_search?: boolean
  use_reranking?: boolean
  use_multi_query?: boolean
  use_hyde?: boolean
  use_graph_rag?: boolean
  auto_route?: boolean
  show_debug?: boolean

  // Multilingual features
  enable_multilingual?: boolean
  query_language?: string | null
  use_multilingual_embeddings?: boolean
  use_multilingual_bm25?: boolean
  use_multilingual_hyde?: boolean
  use_multilingual_classifier?: boolean
  detect_language?: boolean
}

export interface RAGSource {
  content: string
  metadata: {
    filename: string
    page?: number
    chunk_index?: number
    title?: string
    url?: string
  }
  score: number
}

export interface RAGQueryResponse {
  answer: string
  sources: RAGSource[]
  metadata?: {
    detected_language?: string
    language_confidence?: number
    query_classification?: {
      query_type: string
      confidence: number
      language: string
      entities: any[]
      has_negation: boolean
      suggested_strategy: string
    }
    [key: string]: any
  }
  debug_info?: {
    query_contextualized?: string
    routing_decision?: string
    retrieval_strategy?: string
    retrieval_time_ms?: number
    rerank_time_ms?: number
    generation_time_ms?: number
    total_time_ms?: number
  }
}

/**
 * Query the RAG system (non-streaming)
 */
export async function query(request: RAGQueryRequest): Promise<RAGQueryResponse> {
  const response = await fetch(`${RAG_API_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Query failed: ${error}`)
  }

  return response.json()
}


/**
 * Model Management Types
 */
export interface RAGModel {
  name: string
  type: "embedding" | "reranker"
  dimension?: number
  provider: "huggingface" | "ollama"
}

export interface RAGHealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  ollama_available: boolean
  vector_store_healthy: boolean
  models_loaded: string[]
  issues?: string[]
}

/**
 * List available models
 */
export async function listModels(): Promise<RAGModel[]> {
  const response = await fetch(`${RAG_API_URL}/models`)

  if (!response.ok) {
    throw new Error(`Failed to list models: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Check health status of RAG system
 */
export async function checkHealth(): Promise<RAGHealthStatus> {
  try {
    const response = await fetch(`${RAG_API_URL}/health/models`)

    if (!response.ok) {
      return {
        status: "unhealthy",
        ollama_available: false,
        vector_store_healthy: false,
        models_loaded: [],
        issues: ["Failed to connect to backend"],
      }
    }

    return response.json()
  } catch (error) {
    return {
      status: "unhealthy",
      ollama_available: false,
      vector_store_healthy: false,
      models_loaded: [],
      issues: [error instanceof Error ? error.message : "Unknown error"],
    }
  }
}

/**
 * Pull a model from Ollama
 */
export async function pullModel(model: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${RAG_API_URL}/models/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to pull model: ${error}`)
  }

  return response.json()
}

/**
 * Query Logs Types
 */
export interface RAGQueryLog {
  query_id: string
  timestamp: string
  collection_id: string
  query: string
  query_contextualized?: string
  routing_decision?: string
  retrieval_strategy?: string
  num_sources: number
  avg_score: number
  retrieval_time_ms: number
  rerank_time_ms?: number
  generation_time_ms: number
  total_time_ms: number
}

/**
 * Get query logs
 */
export async function getQueryLogs(
  collectionId?: string,
  limit: number = 100
): Promise<RAGQueryLog[]> {
  const params = new URLSearchParams()
  if (collectionId) params.append("collection_id", collectionId)
  params.append("limit", String(limit))

  const response = await fetch(`${RAG_API_URL}/stats/queries?${params}`)

  if (!response.ok) {
    throw new Error(`Failed to get query logs: ${response.statusText}`)
  }

  const data = await response.json()
  // Backend returns {logs: [...], stats: {...}}, extract just the logs array
  return Array.isArray(data) ? data : (data?.logs || [])
}

/**
 * Get list of URLs in a collection
 */
export async function listUrls(collectionId: string): Promise<string[]> {
  const response = await fetch(`${RAG_API_URL}/collections/${collectionId}/urls`)

  if (!response.ok) {
    throw new Error(`Failed to list URLs: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Evaluation
 */
export async function evaluate(
  collectionId: string,
  dataset?: any
): Promise<any> {
  const response = await fetch(`${RAG_API_URL}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collection_id: collectionId,
      dataset,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Evaluation failed: ${error}`)
  }

  return response.json()
}
