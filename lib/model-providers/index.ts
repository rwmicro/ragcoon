export * from "./types"
export { OllamaProvider } from "./ollama-provider"
export { HuggingFaceProvider } from "./huggingface-provider"

import type { ModelProvider, ModelProviderType, ModelProviderConfig } from "./types"
import { OllamaProvider } from "./ollama-provider"
import { HuggingFaceProvider } from "./huggingface-provider"

/**
 * Provider Factory
 * Creates the appropriate provider instance based on configuration
 */
export class ModelProviderFactory {
  static create(config: ModelProviderConfig): ModelProvider {
    switch (config.type) {
      case "ollama":
        return new OllamaProvider(config.baseUrl)

      case "huggingface":
        return new HuggingFaceProvider(config.baseUrl, config.apiKey)

      default:
        throw new Error(`Unknown provider type: ${config.type}`)
    }
  }

  static getAvailableProviders(): ModelProviderType[] {
    return ["ollama", "huggingface"]
  }

  static getDefaultConfigs(): Record<ModelProviderType, ModelProviderConfig> {
    return {
      ollama: {
        type: "ollama",
        baseUrl: "http://localhost:11434",
        enabled: true,
      },
      huggingface: {
        type: "huggingface",
        baseUrl: "https://api-inference.huggingface.co",
        enabled: false, // Disabled by default until implemented
      },
    }
  }
}
