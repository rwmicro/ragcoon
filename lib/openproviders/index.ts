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

// Ollama (≥0.6) strips <think> tags from text for thinking models (Qwen3, DeepSeek-R1)
// and exposes them as `delta.thinking` in the SSE stream instead.
// extractReasoningMiddleware only reads from the TEXT stream, so we re-inject
// the thinking content as <think>...</think> text so the middleware can intercept it.
function makeOllamaStreamTransformer() {
  let thinkingOpen = false
  let firstThinkingChunk = true

  return function transformLine(line: string): string {
    if (!line.startsWith("data: ")) return line
    const data = line.slice(6).trim()
    if (!data || data === "[DONE]") return line
    try {
      const json = JSON.parse(data)
      const delta = json?.choices?.[0]?.delta
      if (!delta) return line

      if ("reasoning" in delta && delta.reasoning) {
        // Re-inject as <think> text so extractReasoningMiddleware can see it
        const thinkContent = delta.reasoning as string
        delta.content = (firstThinkingChunk ? "<think>" : "") + thinkContent
        firstThinkingChunk = false
        thinkingOpen = true
        delete delta.reasoning
        return `data: ${JSON.stringify(json)}`
      }

      if (thinkingOpen && delta.content) {
        // First non-empty content delta: close the <think> tag
        delta.content = "</think>" + delta.content
        thinkingOpen = false
        return `data: ${JSON.stringify(json)}`
      }

      return line
    } catch {
      return line
    }
  }
}

async function ollamaFetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await globalThis.fetch(url, init)
  const ct = response.headers.get("content-type") ?? ""
  if (!response.body || !ct.includes("text/event-stream")) {
    return response
  }

  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ""
  const transformLine = makeOllamaStreamTransformer()

  const transformed = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        const out = lines.map(transformLine).join("\n")
        if (out) controller.enqueue(encoder.encode(out + "\n"))
      },
      flush(controller) {
        if (buffer.trim()) {
          controller.enqueue(encoder.encode(transformLine(buffer)))
        }
      },
    })
  )

  return new Response(transformed, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

// Create Ollama provider instance with configurable baseURL
const createOllamaProvider = () => {
  return createOpenAI({
    baseURL: getOllamaBaseURL(),
    apiKey: "ollama", // Ollama doesn't require a real API key
    name: "ollama",
    fetch: ollamaFetch,
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
