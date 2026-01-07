export type RetrievalStrategy = "basic" | "hyde" | "multi-query" | "graph-rag"

export interface RetrievalSettings {
  topK: number
  hybridSearch: boolean
  useReranking: boolean
  strategy: RetrievalStrategy
  showDebugInfo: boolean
  // Advanced HyDE settings
  numHypotheticalDocs: number
  hydeFusion: "average" | "max" | "rrf"
  // Multi-query settings
  numQueryVariations: number
  // Graph RAG settings
  graphExpansionDepth: number
  graphAlpha: number
  autoRoute: boolean
  // Multilingual settings
  enableMultilingual: boolean
  queryLanguage?: string | null
  useMultilingualEmbeddings: boolean
  useMultilingualBM25: boolean
  useMultilingualHyDE: boolean
  useMultilingualClassifier: boolean
  detectLanguage: boolean
}

export interface IngestionSettings {
  chunkingStrategy: "semantic" | "recursive" | "markdown" | "smart"
  chunkSize: number
  chunkOverlap: number
  embeddingModel: string
  useOllamaEmbedding: boolean
  useHybridEmbedding: boolean
  useAdaptiveFusion: boolean
  structuralWeight: number
}

export type ResponseLength = "concise" | "balanced" | "detailed"

export interface LLMSettings {
  model: string
  temperature: number
  responseLength: ResponseLength
  systemPrompt: string
  maxTokens: number
}

export interface UISettings {
  theme: "light" | "dark" | "system"
  fontSize: number
  compactMode: boolean
}

export interface RAGSettings {
  retrieval: RetrievalSettings
  ingestion: IngestionSettings
  llm: LLMSettings
  ui: UISettings
  lastCollectionId: string
}

export const DEFAULT_RETRIEVAL_SETTINGS: RetrievalSettings = {
  topK: 5,
  hybridSearch: true,
  useReranking: true,
  strategy: "basic",
  showDebugInfo: false,
  numHypotheticalDocs: 3,
  hydeFusion: "rrf",
  numQueryVariations: 2,
  graphExpansionDepth: 1,
  graphAlpha: 0.7,
  autoRoute: true,
  // Multilingual defaults - auto-enabled backend features
  enableMultilingual: true,         // Toujours actif
  queryLanguage: null,              // Auto-detect par défaut
  useMultilingualEmbeddings: true,  // Toujours actif (multilingual-e5-large)
  useMultilingualBM25: true,        // Toujours actif
  useMultilingualHyDE: false,       // Contrôlable par l'utilisateur
  useMultilingualClassifier: true,  // Toujours actif
  detectLanguage: true,             // Toujours actif
}

export const DEFAULT_INGESTION_SETTINGS: IngestionSettings = {
  chunkingStrategy: "smart",
  chunkSize: 1000,
  chunkOverlap: 200,
  embeddingModel: "BAAI/bge-large-en-v1.5",
  useOllamaEmbedding: false,
  useHybridEmbedding: false,
  useAdaptiveFusion: false,
  structuralWeight: 0.3,
}

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  model: "llama3.1:8b",
  temperature: 0.7,
  responseLength: "balanced",
  systemPrompt: "",
  maxTokens: 2048,
}

export const DEFAULT_UI_SETTINGS: UISettings = {
  theme: "system",
  fontSize: 14,
  compactMode: false,
}

export const DEFAULT_RAG_SETTINGS: RAGSettings = {
  retrieval: DEFAULT_RETRIEVAL_SETTINGS,
  ingestion: DEFAULT_INGESTION_SETTINGS,
  llm: DEFAULT_LLM_SETTINGS,
  ui: DEFAULT_UI_SETTINGS,
  lastCollectionId: "",
}
