// Types pour le système RAG

export interface DocumentChunk {
  id: string
  content: string
  metadata: DocumentMetadata
  embedding?: number[]
}

export interface DocumentMetadata {
  source: string
  filename: string
  fileType: 'md' | 'pdf'
  chunkIndex: number
  totalChunks: number
  pageNumber?: number
  title?: string
  createdAt: string
}

export interface QueryResult {
  chunk: DocumentChunk
  score: number
  distance: number
}

export interface RAGResponse {
  answer: string
  sources: QueryResult[]
  query: string
}

export interface ChunkingOptions {
  chunkSize: number // mots par chunk
  overlap: number // mots de chevauchement
  minChunkSize?: number
}

export interface EmbeddingOptions {
  model?: string // modèle Ollama pour embeddings
  endpoint?: string
}
