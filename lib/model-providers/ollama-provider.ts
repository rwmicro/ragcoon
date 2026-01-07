import type { ModelProvider, Model, ModelInfo } from "./types"

export class OllamaProvider implements ModelProvider {
  readonly type = "ollama" as const
  readonly name = "Ollama"
  readonly baseUrl: string

  constructor(baseUrl: string = "http://localhost:11434") {
    this.baseUrl = baseUrl
  }

  async listModels(): Promise<Model[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      if (!response.ok) {
        throw new Error("Failed to fetch models")
      }

      const data = await response.json()
      return data.models?.map((model: any) => ({
        id: model.name,
        name: model.name,
        provider: this.type,
        size: this.formatBytes(model.size || 0),
        modified: model.modified_at,
      })) || []
    } catch (error) {
      console.error("Ollama: Failed to list models:", error)
      return []
    }
  }

  async validateModel(modelId: string): Promise<boolean> {
    try {
      const models = await this.listModels()
      return models.some(m => m.id === modelId)
    } catch {
      return false
    }
  }

  async getModelInfo(modelId: string): Promise<ModelInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelId }),
      })

      if (!response.ok) {
        throw new Error("Failed to get model info")
      }

      const data = await response.json()

      return {
        id: modelId,
        name: modelId,
        size: this.formatBytes(data.size || 0),
        description: data.license,
        tags: data.details?.families || [],
        modified: data.modified_at,
      }
    } catch (error) {
      console.error("Ollama: Failed to get model info:", error)
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      return response.ok
    } catch {
      return false
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }
}
