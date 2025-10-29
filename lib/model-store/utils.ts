import { FREE_MODELS_IDS } from "@/lib/config"
import { ModelConfig } from "@/lib/models/types"

/**
 * Utility function to filter and sort models based on search and visibility
 * @param models - All available models
 * @param searchQuery - Search query to filter by model name
 * @param isModelHidden - Function to check if a model is hidden
 * @returns Filtered and sorted models
 */
export function filterAndSortModels(
  models: ModelConfig[],
  searchQuery: string,
  isModelHidden: (modelId: string) => boolean
): ModelConfig[] {
  return models
    .filter((model) => !isModelHidden(model.id))
    .filter((model) =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort with free models first
      const aIsFree = FREE_MODELS_IDS.includes(a.id)
      const bIsFree = FREE_MODELS_IDS.includes(b.id)
      return aIsFree === bIsFree ? 0 : aIsFree ? -1 : 1
    })
}
