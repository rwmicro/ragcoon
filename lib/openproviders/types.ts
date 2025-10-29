// Static Ollama models for type safety
export type StaticOllamaModel = "llama3.2:latest" | "qwen2.5-coder:latest"

// Dynamic Ollama model type - allows any string for auto-detected models
export type OllamaModel = StaticOllamaModel | (string & {})

export type Provider = "ollama"

export type SupportedModel = OllamaModel