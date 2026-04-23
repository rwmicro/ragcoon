import type { Model, ModelInfo, ModelProvider } from "./types"

/**
 * LM Studio exposes an OpenAI-compatible API at http://0.0.0.0:1234/v1 by default.
 * /v1/models returns { data: [{ id, object, owned_by, ... }] }.
 */
export class LMStudioProvider implements ModelProvider {
  readonly type = "lmstudio" as const
  readonly name = "LM Studio"
  readonly baseUrl: string

  constructor(baseUrl: string = "http://0.0.0.0:1234") {
    this.baseUrl = baseUrl.replace(/\/+$/, "")
  }

  private apiUrl(path: string): string {
    return `${this.baseUrl}/v1${path}`
  }

  async listModels(): Promise<Model[]> {
    try {
      const response = await fetch(this.apiUrl("/models"))
      if (!response.ok) {
        throw new Error(`LM Studio /models failed: ${response.status}`)
      }
      const data = await response.json()
      const entries: any[] = Array.isArray(data?.data) ? data.data : []
      return entries.map((entry) => ({
        id: entry.id,
        name: entry.id,
        provider: this.type,
      }))
    } catch (error) {
      console.warn("LM Studio: Failed to list models:", error)
      return []
    }
  }

  async validateModel(modelId: string): Promise<boolean> {
    const models = await this.listModels()
    return models.some((m) => m.id === modelId)
  }

  async getModelInfo(modelId: string): Promise<ModelInfo> {
    return { id: modelId, name: modelId }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.apiUrl("/models"))
      return response.ok
    } catch {
      return false
    }
  }
}
