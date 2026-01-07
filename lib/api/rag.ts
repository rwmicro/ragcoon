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
 * Upload and ingest a file into the RAG system
 */
export async function uploadFile(request: UploadFileRequest): Promise<UploadFileResponse> {
  const formData = new FormData()
  formData.append("file", request.file)

  if (request.collection_id) {
    formData.append("collection_id", request.collection_id)
  }
  if (request.collection_title) {
    formData.append("collection_title", request.collection_title)
  }
  if (request.llm_model) {
    formData.append("llm_model", request.llm_model)
  }
  if (request.chunk_size) {
    formData.append("chunk_size", request.chunk_size.toString())
  }
  if (request.chunk_overlap) {
    formData.append("chunk_overlap", request.chunk_overlap.toString())
  }
  if (request.chunking_strategy) {
    formData.append("chunking_strategy", request.chunking_strategy)
  }
  if (request.embedding_model) {
    formData.append("embedding_model_name", request.embedding_model)
  }
  if (request.embedding_provider) {
    formData.append("embedding_provider", request.embedding_provider)
  }
  if (request.use_ollama_embedding !== undefined) {
    formData.append("use_ollama_embedding", request.use_ollama_embedding.toString())
  }
  if (request.use_hybrid_embedding !== undefined) {
    formData.append("use_hybrid_embedding", request.use_hybrid_embedding.toString())
  }
  if (request.use_adaptive_fusion !== undefined) {
    formData.append("use_adaptive_fusion", request.use_adaptive_fusion.toString())
  }
  if (request.structural_weight !== undefined) {
    formData.append("structural_weight", request.structural_weight.toString())
  }
  if (request.reranker_model) {
    formData.append("reranker_model", request.reranker_model)
  }

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
  formData.append("collection_title", request.collection_title)

  if (request.collection_id) {
    formData.append("collection_id", request.collection_id)
  }
  if (request.llm_model) {
    formData.append("llm_model", request.llm_model)
  }
  if (request.chunk_size) {
    formData.append("chunk_size", request.chunk_size.toString())
  }
  if (request.chunk_overlap) {
    formData.append("chunk_overlap", request.chunk_overlap.toString())
  }
  if (request.chunking_strategy) {
    formData.append("chunking_strategy", request.chunking_strategy)
  }
  if (request.embedding_model) {
    formData.append("embedding_model_name", request.embedding_model)
  }
  if (request.embedding_provider) {
    formData.append("embedding_provider", request.embedding_provider)
  }
  if (request.use_ollama_embedding !== undefined) {
    formData.append("use_ollama_embedding", request.use_ollama_embedding.toString())
  }
  if (request.use_hybrid_embedding !== undefined) {
    formData.append("use_hybrid_embedding", request.use_hybrid_embedding.toString())
  }
  if (request.use_adaptive_fusion !== undefined) {
    formData.append("use_adaptive_fusion", request.use_adaptive_fusion.toString())
  }
  if (request.structural_weight !== undefined) {
    formData.append("structural_weight", request.structural_weight.toString())
  }
  if (request.reranker_model) {
    formData.append("reranker_model", request.reranker_model)
  }

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
export interface IngestDirectoryRequest {
  recursive?: boolean
  chunkSize?: number
  chunkOverlap?: number
  chunkingStrategy?: "semantic" | "recursive" | "markdown"
}

export async function ingestDirectory(
  request: IngestDirectoryRequest = {}
): Promise<UploadFileResponse> {
  const response = await fetch(`${RAG_API_URL}/ingest/directory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recursive: request.recursive ?? true,
      chunk_size: request.chunkSize ?? 1000,
      chunk_overlap: request.chunkOverlap ?? 200,
      chunking_strategy: request.chunkingStrategy ?? "semantic",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Directory ingestion failed: ${error}`)
  }

  return response.json()
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
  use_hybrid?: boolean
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
 * Query the RAG system (streaming)
 */
export async function* queryStream(request: RAGQueryRequest): AsyncGenerator<string> {
  const response = await fetch(`${RAG_API_URL}/query/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Stream query failed: ${error}`)
  }

  if (!response.body) {
    throw new Error("Response body is null")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split("\n")

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim()
          if (data === "[DONE]") return
          if (data) yield data
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
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
 * Clear graph cache
 */
export async function clearGraphCache(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${RAG_API_URL}/cache/graph`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error(`Failed to clear graph cache: ${response.statusText}`)
  }

  return response.json()
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
 * Get Graph RAG visualization data for a collection
 */
export async function getCollectionGraph(collectionId: string): Promise<{
  nodes: Array<{
    id: string
    type: "entity" | "chunk"
    entity_type?: string
    label: string
    mentions?: number
    importance?: number
    embedding?: number[]
    content?: string
  }>
  edges: Array<{
    source: string
    target: string
    type: string
    weight: number
  }>
  stats: {
    num_entities: number
    num_chunks: number
    num_edges: number
    avg_entities_per_chunk: number
    top_entities: Array<{
      name: string
      mentions: number
      importance: number
    }>
  }
}> {
  const response = await fetch(`${RAG_API_URL}/collections/${collectionId}/graph`)

  if (!response.ok) {
    throw new Error(`Failed to get collection graph: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get UMAP projection of collection embeddings for visualization
 */
export async function getCollectionUMAP(
  collectionId: string,
  options?: {
    n_components?: number
    n_neighbors?: number
    min_dist?: number
    metric?: string
  }
): Promise<{
  points: Array<{
    coordinates: number[]
    label: string
    metadata: {
      chunk_id: string
      source: string
      file_name: string
    }
  }>
  labels: string[]
  stats: {
    num_points: number
    n_components: number
    n_neighbors: number
    min_dist: number
    metric: string
  }
}> {
  const params = new URLSearchParams()
  if (options?.n_components) params.append("n_components", options.n_components.toString())
  if (options?.n_neighbors) params.append("n_neighbors", options.n_neighbors.toString())
  if (options?.min_dist) params.append("min_dist", options.min_dist.toString())
  if (options?.metric) params.append("metric", options.metric)

  const url = `${RAG_API_URL}/collections/${collectionId}/umap${params.toString() ? `?${params.toString()}` : ""}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to get UMAP projection: ${response.statusText}`)
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
