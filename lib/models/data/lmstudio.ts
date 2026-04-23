import { openproviders } from "@/lib/openproviders"
import { ModelConfig } from "../types"

interface LMStudioModelEntry {
  id: string
  object?: string
  owned_by?: string
}

interface LMStudioListResponse {
  data: LMStudioModelEntry[]
}

const getLMStudioBaseURL = (): string => {
  if (typeof window !== "undefined") {
    return "http://0.0.0.0:1234"
  }
  return (
    process.env.LMSTUDIO_BASE_URL?.replace(/\/+$/, "") || "http://0.0.0.0:1234"
  )
}

function extractFamilyFromId(modelId: string): string {
  const name = modelId.toLowerCase()
  if (name.includes("codellama")) return "Code Llama"
  if (name.includes("codegemma")) return "CodeGemma"
  if (name.includes("deepseek")) return "DeepSeek"
  if (name.includes("llama")) return "Llama"
  if (name.includes("qwen")) return "Qwen"
  if (name.includes("mistral")) return "Mistral"
  if (name.includes("mixtral")) return "Mistral"
  if (name.includes("phi")) return "Phi"
  if (name.includes("gemma")) return "Gemma"
  if (name.includes("starcoder")) return "StarCoder"
  if (name.includes("yi")) return "Yi"
  if (name.includes("openchat")) return "OpenChat"
  if (name.includes("vicuna")) return "Vicuna"
  return "Unknown"
}

function getProviderFromFamily(family: string): string {
  switch (family) {
    case "Llama":
    case "Code Llama":
      return "Meta"
    case "Qwen":
      return "Alibaba"
    case "DeepSeek":
      return "DeepSeek"
    case "Mistral":
      return "Mistral AI"
    case "Phi":
      return "Microsoft"
    case "Gemma":
    case "CodeGemma":
      return "Google"
    case "Yi":
      return "01.AI"
    default:
      return "Community"
  }
}

function getIconFromFamily(family: string): string {
  switch (family) {
    case "Llama":
    case "Code Llama":
      return "meta"
    case "Qwen":
      return "qwen"
    case "DeepSeek":
      return "deepseek"
    case "Mistral":
      return "mistral"
    case "Gemma":
    case "CodeGemma":
      return "google"
    default:
      return "lmstudio"
  }
}

function extractSizeFromId(modelId: string): string | null {
  const sizeMatch = modelId.match(/(\d+\.?\d*)[bB](?![a-z])/)
  return sizeMatch ? `${sizeMatch[1]}B` : null
}

function estimateContextWindow(family: string, modelId: string): number {
  const name = modelId.toLowerCase()
  if (name.includes("32k")) return 32768
  if (name.includes("128k")) return 131072
  if (name.includes("1m")) return 1048576
  switch (family) {
    case "Llama":
      return name.includes("3.2") || name.includes("3.1") ? 128000 : 8192
    case "Qwen":
      return 32768
    case "DeepSeek":
      return 163840
    case "Mistral":
      return 32768
    case "Phi":
      return 128000
    case "Gemma":
      return 8192
    default:
      return 8192
  }
}

function checkVisionCapability(modelId: string): boolean {
  const name = modelId.toLowerCase()
  return (
    name.includes("vision") ||
    name.includes("visual") ||
    name.includes("llava") ||
    name.includes("moondream") ||
    name.includes("-vl") ||
    name.includes("vl-") ||
    name.includes("multimodal")
  )
}

function formatModelName(modelId: string): string {
  const base = modelId.split("/").pop() || modelId
  return base
    .replace(/-gguf$/i, "")
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

async function detectLMStudioModels(): Promise<ModelConfig[]> {
  try {
    const baseURL = getLMStudioBaseURL()
    const response = await fetch(`${baseURL}/v1/models`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (!response.ok) {
      console.warn(`LM Studio not available at ${baseURL} or no models found`)
      return []
    }

    const data: LMStudioListResponse = await response.json()
    const entries = Array.isArray(data?.data) ? data.data : []

    return entries.map((entry): ModelConfig => {
      const modelId = entry.id
      const family = extractFamilyFromId(modelId)
      const provider = getProviderFromFamily(family)
      const icon = getIconFromFamily(family)
      const parameterSize = extractSizeFromId(modelId)
      const contextWindow = estimateContextWindow(family, modelId)

      const tags = ["local", "lmstudio"]
      if (parameterSize) tags.push(parameterSize.toLowerCase())
      if (modelId.toLowerCase().includes("code")) tags.push("coding")

      const description = parameterSize
        ? `${parameterSize} • LM Studio`
        : "LM Studio"

      return {
        id: modelId,
        name: formatModelName(modelId),
        provider,
        providerId: "lmstudio",
        baseProviderId: "lmstudio",
        modelFamily: family,
        description,
        tags,
        contextWindow,
        inputCost: 0.0,
        outputCost: 0.0,
        priceUnit: "free (local)",
        vision: checkVisionCapability(modelId),
        tools: true,
        audio: false,
        reasoning: ["Llama", "Qwen", "DeepSeek", "Mistral", "Phi"].includes(family),
        openSource: true,
        speed: "Medium",
        intelligence: "High",
        website: "https://lmstudio.ai",
        apiDocs: "https://lmstudio.ai/docs/api/openai-api",
        modelPage: "https://lmstudio.ai",
        icon,
        apiSdk: (apiKey?: string) =>
          openproviders(modelId as string, undefined, apiKey, "lmstudio"),
      }
    })
  } catch (error) {
    console.warn("Failed to detect LM Studio models:", error)
    return []
  }
}

export async function getLMStudioModels(): Promise<ModelConfig[]> {
  const detectedModels = await detectLMStudioModels()

  if (detectedModels.length > 0) {
    console.info(`Detected ${detectedModels.length} LM Studio models`)
  } else {
    console.info("No LM Studio models detected - server may not be running")
  }

  return detectedModels
}
