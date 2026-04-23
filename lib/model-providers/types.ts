/**
 * Model Provider Interface
 * Abstracts model provider implementations (Ollama, HuggingFace, etc.)
 */

export interface Model {
  id: string
  name: string
  provider: ModelProviderType
  size?: string
  contextLength?: number
  parameterCount?: string
}

export type ModelProviderType = "ollama" | "lmstudio" | "huggingface"

export interface ModelInfo {
  id: string
  name: string
  size?: string
  contextLength?: number
  parameterCount?: string
  description?: string
  tags?: string[]
  modified?: string
}

export interface ModelProvider {
  readonly type: ModelProviderType
  readonly name: string
  readonly baseUrl: string

  /**
   * List all available models
   */
  listModels(): Promise<Model[]>

  /**
   * Validate that a model exists and is available
   */
  validateModel(modelId: string): Promise<boolean>

  /**
   * Get detailed information about a specific model
   */
  getModelInfo(modelId: string): Promise<ModelInfo>

  /**
   * Test connection to the provider
   */
  testConnection(): Promise<boolean>
}

/**
 * Model provider configuration
 */
export interface ModelProviderConfig {
  type: ModelProviderType
  baseUrl: string
  apiKey?: string
  enabled: boolean
}
