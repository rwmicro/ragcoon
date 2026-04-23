import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModelV1 } from "@ai-sdk/provider"
import { getProviderForModel } from "./provider-map"
import type {
  LMStudioModel,
  OllamaModel,
  Provider,
  SupportedModel,
} from "./types"

type OllamaProviderSettings = Parameters<ReturnType<typeof createOpenAI>>[1] // Ollama uses OpenAI-compatible API
type LMStudioProviderSettings = OllamaProviderSettings

type ModelSettings<T extends SupportedModel> = T extends OllamaModel
  ? OllamaProviderSettings
  : T extends LMStudioModel
    ? LMStudioProviderSettings
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

// Get LM Studio base URL — LM Studio exposes an OpenAI-compatible API at /v1
const getLMStudioBaseURL = () => {
  if (typeof window !== "undefined") {
    return "http://0.0.0.0:1234/v1"
  }

  const baseUrl = process.env.LMSTUDIO_BASE_URL || "http://0.0.0.0:1234"
  return baseUrl.replace(/\/+$/, "") + "/v1"
}

// Thinking models expose chain-of-thought as a separate SSE field (not in `content`):
//   - Ollama (≥0.6) uses `delta.reasoning`
//   - LM Studio (DeepSeek-style) uses `delta.reasoning_content`
// `extractReasoningMiddleware` only reads the TEXT stream, so we re-inject the
// reasoning payload as <think>...</think> inside `delta.content`.
function makeReasoningStreamTransformer(reasoningFields: string[]) {
  let thinkingOpen = false
  let firstThinkingChunk = true

  function pickReasoning(delta: Record<string, unknown>): { field: string; value: unknown } | null {
    for (const field of reasoningFields) {
      if (field in delta) return { field, value: delta[field] }
    }
    return null
  }

  function transformLine(line: string): string {
    if (!line.startsWith("data: ")) return line
    const data = line.slice(6).trim()
    if (!data || data === "[DONE]") return line
    try {
      const json = JSON.parse(data)
      const delta = json?.choices?.[0]?.delta
      if (!delta) return line

      const reasoning = pickReasoning(delta)
      if (reasoning) {
        if (reasoning.value) {
          const thinkContent = reasoning.value as string
          delta.content = (firstThinkingChunk ? "<think>" : "") + thinkContent
          firstThinkingChunk = false
          thinkingOpen = true
        }
        // Always strip the reasoning field (even if empty) so the SDK doesn't see it
        delete delta[reasoning.field]
        return `data: ${JSON.stringify(json)}`
      }

      if (thinkingOpen) {
        // First non-reasoning delta: close the <think> tag regardless of content value
        delta.content = "</think>" + (delta.content ?? "")
        thinkingOpen = false
        return `data: ${JSON.stringify(json)}`
      }

      return line
    } catch {
      return line
    }
  }

  // Call at end of stream to ensure <think> is always closed
  function closeIfOpen(): string | null {
    if (!thinkingOpen) return null
    thinkingOpen = false
    return `data: ${JSON.stringify({ choices: [{ delta: { content: "</think>" }, finish_reason: null }] })}`
  }

  return { transformLine, closeIfOpen }
}

function makeReasoningFetch(reasoningFields: string[]) {
  return async function reasoningFetch(
    url: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const response = await globalThis.fetch(url, init)
    const ct = response.headers.get("content-type") ?? ""
    if (!response.body || !ct.includes("text/event-stream")) {
      return response
    }

    const decoder = new TextDecoder()
    const encoder = new TextEncoder()
    let buffer = ""
    const { transformLine, closeIfOpen } =
      makeReasoningStreamTransformer(reasoningFields)

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
          // Safety net: if stream ended while <think> was still open, close it
          const closing = closeIfOpen()
          if (closing) {
            controller.enqueue(encoder.encode("\n" + closing + "\n"))
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
}

const ollamaFetch = makeReasoningFetch(["reasoning"])
const lmstudioFetch = makeReasoningFetch(["reasoning_content", "reasoning"])

// Create Ollama provider instance with configurable baseURL
const createOllamaProvider = () => {
  return createOpenAI({
    baseURL: getOllamaBaseURL(),
    apiKey: "ollama", // Ollama doesn't require a real API key
    name: "ollama",
    fetch: ollamaFetch,
  })
}

// LM Studio uses `delta.reasoning_content` for thinking models (DeepSeek-style).
// Re-inject as <think>...</think> so extractReasoningMiddleware picks it up.
const createLMStudioProvider = () => {
  return createOpenAI({
    baseURL: getLMStudioBaseURL(),
    apiKey: "lm-studio", // LM Studio accepts any non-empty key
    name: "lmstudio",
    fetch: lmstudioFetch,
  })
}

export function openproviders<T extends SupportedModel>(
  modelId: T,
  settings?: OpenProvidersOptions<T>,
  apiKey?: string,
  providerOverride?: Provider
): LanguageModelV1 {
  const provider = providerOverride ?? getProviderForModel(modelId)

  if (provider === "ollama") {
    const ollamaProvider = createOllamaProvider()
    return ollamaProvider(
      modelId as OllamaModel,
      settings as OllamaProviderSettings
    )
  }

  if (provider === "lmstudio") {
    const lmstudioProvider = createLMStudioProvider()
    return lmstudioProvider(
      modelId as LMStudioModel,
      settings as LMStudioProviderSettings
    )
  }

  throw new Error(`Unsupported model: ${modelId}.`)
}
