import { FREE_MODELS_IDS } from "../config"
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

    // RAG functionality removed - only Ollama models available
    dynamicModelsCache = [...detectedOllamaModels]

    lastFetchTime = now
    return dynamicModelsCache
  } catch (error) {
    console.warn("Failed to load models:", error)
    return []
  }
}

export async function getModelsWithAccessFlags(): Promise<ModelConfig[]> {
  const models = await getAllModels()

  const freeModels = models
    .filter(
      (model) =>
        FREE_MODELS_IDS.includes(model.id) || 
        model.providerId === "ollama" || 
        model.providerId === "rag"
    )
    .map((model) => ({
      ...model,
      accessible: true,
    }))

  const proModels = models
    .filter((model) => !freeModels.map((m) => m.id).includes(model.id))
    .map((model) => ({
      ...model,
      accessible: false,
    }))

  return [...freeModels, ...proModels]
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

// Function to refresh models cache when RAG models change
export async function refreshWithRagModels(): Promise<void> {
  refreshModelsCache()
  await getAllModels() // This will rebuild the cache with latest models
}
