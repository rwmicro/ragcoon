// Static Ollama models for type safety
export type StaticOllamaModel = "llama3.2:latest" | "qwen2.5-coder:latest"

// Dynamic Ollama model type - allows any string for auto-detected models (including cloud models)
export type OllamaModel = StaticOllamaModel | (string & {})

// LM Studio exposes an OpenAI-compatible API. Model IDs are opaque strings from /v1/models.
export type LMStudioModel = string & {}

export type Provider = "ollama" | "lmstudio"

export type SupportedModel = OllamaModel | LMStudioModel