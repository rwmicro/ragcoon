import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModelV1 } from "@ai-sdk/provider"
import { getProviderForModel } from "./provider-map"
import type {
  OllamaModel,
  SupportedModel,
} from "./types"

type OllamaProviderSettings = Parameters<ReturnType<typeof createOpenAI>>[1] // Ollama uses OpenAI-compatible API

type ModelSettings<T extends SupportedModel> = T extends OllamaModel
  ? OllamaProviderSettings
  : never

export type OpenProvidersOptions<T extends SupportedModel> = ModelSettings<T>

// Get Ollama base URL from environment or use default
const getOllamaBaseURL = () => {
  if (typeof window !== "undefined") {
    // Client-side: use localhost
    return "http://localhost:11434/v1"
  }

  // Server-side: check environment variables
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
  return baseUrl.replace(/\/+$/, "") + "/v1"
}

// Create Ollama provider instance with configurable baseURL
const createOllamaProvider = () => {
  return createOpenAI({
    baseURL: getOllamaBaseURL(),
    apiKey: "ollama", // Ollama doesn't require a real API key
    name: "ollama",
  })
}

export function openproviders<T extends SupportedModel>(
  modelId: T,
  settings?: OpenProvidersOptions<T>,
  apiKey?: string
): LanguageModelV1 {
  const provider = getProviderForModel(modelId)

  if (provider === "ollama") {
    const ollamaProvider = createOllamaProvider()
    return ollamaProvider(
      modelId as OllamaModel,
      settings as OllamaProviderSettings
    )
  }

  throw new Error(`Unsupported model: ${modelId}. Only Ollama models are supported.`)
}
