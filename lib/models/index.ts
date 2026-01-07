import { get } from "http"
import { getOllamaModels, ollamaModels } from "./data/ollama"
import { ModelConfig } from "./types"

// Static models (always available) - Only Ollama
const STATIC_MODELS: ModelConfig[] = [
  ...ollamaModels, // Static fallback Ollama models
]

// Dynamic models cache
let dynamicModelsCache: ModelConfig[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getRagModels(): Promise<ModelConfig[]> {
  try {
    // Fetch collections from Python backend
    const response = await fetch("http://127.0.0.1:8001/collections", {
      next: { revalidate: 0 }, // Disable caching
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const collections = data.collections || []

    if (collections.length === 0) {
      return []
    }

    // Create a model for each collection
    return collections.map((col: any) => ({
      id: `rag:${col.id}`,
      name: col.title,
      provider: "RAG",
      providerId: "rag",
      baseProviderId: "rag",
      description: `${col.file_count} files • ${col.chunk_count} chunks • ${col.llm_model}`,
      isRAG: true,
      collectionName: col.id,
      contextWindow: 128000,
      icon: "database",
      speed: "Medium",
      intelligence: "High",
    }))
  } catch (error) {
    console.error('[getRagModels] Error fetching RAG models:', error)
    return []
  }
}

// Function to get all models including dynamically detected ones and RAG models
export async function getAllModels(): Promise<ModelConfig[]> {
  const now = Date.now()

  // Use cache if it's still valid
  if (dynamicModelsCache && now - lastFetchTime < CACHE_DURATION) {
    return dynamicModelsCache
  }

  try {
    // Get dynamically detected Ollama models (includes enabled check internally)
    const detectedOllamaModels = await getOllamaModels()
    const ragModels = await getRagModels()

    // Combine Ollama models with RAG models
    dynamicModelsCache = [...detectedOllamaModels, ...ragModels]

    lastFetchTime = now
    return dynamicModelsCache
  } catch (error) {
    console.warn("Failed to load models:", error)
    return []
  }
}

// Synchronous function to get model info for simple lookups
// This uses cached data if available, otherwise returns undefined
export function getModelInfo(modelId: string): ModelConfig | undefined {
  // First check the cache if it exists
  if (dynamicModelsCache) {
    return dynamicModelsCache.find((model) => model.id === modelId)
  }

  // No fallback - return undefined if not in cache
  return undefined
}

// For backward compatibility - static models only
export const MODELS: ModelConfig[] = STATIC_MODELS

// Function to refresh the models cache
export function refreshModelsCache(): void {
  dynamicModelsCache = null
  lastFetchTime = 0
}

// Listen for collection deletion events to clear cache immediately
if (typeof window !== 'undefined') {
  window.addEventListener('rag-collection-deleted', () => {
    refreshModelsCache()
  })
}

// Function to refresh models cache when RAG models change
export async function refreshWithRagModels(): Promise<void> {
  refreshModelsCache()
  await getAllModels() // This will rebuild the cache with latest models
}
