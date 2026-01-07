import { openproviders } from "@/lib/openproviders"
import { ModelConfig } from "../types"

// Interface for Ollama API response
interface OllamaModel {
  name: string
  model: string
  modified_at: string
  size: number
  digest: string
  details: {
    parent_model?: string
    format?: string
    family?: string
    families?: string[]
    parameter_size?: string
    quantization_level?: string
  }
}

interface OllamaListResponse {
  models: OllamaModel[]
}

// Get Ollama base URL from environment or use default
const getOllamaBaseURL = (): string => {
  if (typeof window !== "undefined") {
    // Client-side: use localhost
    return "http://localhost:11434"
  }

  // Server-side: check environment variables
  return (
    process.env.OLLAMA_BASE_URL?.replace(/\/+$/, "") || "http://localhost:11434"
  )
}


// Function to detect available Ollama models
async function detectOllamaModels(): Promise<ModelConfig[]> {

  try {
    const baseURL = getOllamaBaseURL()
    const response = await fetch(`${baseURL}/api/tags`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.warn(`Ollama not available at ${baseURL} or no models found`)
      return []
    }

    const data: OllamaListResponse = await response.json()

    return data.models.map((model): ModelConfig => {
      // Extract model family and size info
      const modelName = model.name

      // Normalize the family name from Ollama or extract from name
      let rawFamily = model.details.family || extractFamilyFromName(modelName)
      const family = normalizeFamilyName(rawFamily, modelName)

      const parameterSize =
        model.details.parameter_size || extractSizeFromName(modelName)
      const sizeInGB = Math.round(model.size / (1024 * 1024 * 1024))

      // Determine provider based on model family
      const provider = getProviderFromFamily(family)

      // Determine icon based on model family
      const icon = getIconFromFamily(family)

      // Generate tags based on model characteristics
      const tags = generateTags(modelName, family, parameterSize, sizeInGB)

      // Estimate context window based on model family
      const contextWindow = estimateContextWindow(family, modelName)

      return {
        id: modelName,
        name: formatModelName(modelName),
        provider: provider,
        providerId: "ollama",
        baseProviderId: "ollama",
        modelFamily: family,
        description: `${parameterSize} • ${sizeInGB}GB • Ollama`,
        tags: tags,
        contextWindow: contextWindow,
        inputCost: 0.0,
        outputCost: 0.0,
        priceUnit: "free (local)",
        vision: checkVisionCapability(modelName, family),
        tools: true, // Most modern models support tools
        audio: false, // Audio support is rare in local models
        reasoning: checkReasoningCapability(family),
        openSource: true, // All Ollama models are open source
        speed: estimateSpeed(parameterSize, sizeInGB),
        intelligence: estimateIntelligence(family, parameterSize),
        website: "https://ollama.com",
        apiDocs: "https://github.com/ollama/ollama/blob/main/docs/api.md",
        modelPage: `https://ollama.com/library/${modelName.split(":")[0]}`,
        icon: icon,
        apiSdk: (apiKey?: string) =>
          openproviders(modelName as string, undefined, apiKey),
      }
    })
  } catch (error) {
    console.warn("Failed to detect Ollama models:", error)
    return []
  }
}

// Helper functions
function normalizeFamilyName(family: string, modelName: string): string {
  // Normalize the family name to match our expected format
  const normalizedFamily = family.toLowerCase().trim()
  const normalizedModelName = modelName.toLowerCase()

  // IMPORTANT: Check model name first for branded models
  // Some models use different architectures but should be branded by their name
  // For example, DeepSeek-R1 uses Qwen2 architecture but should show as DeepSeek
  // Mistral-Nemo uses Llama architecture but should show as Mistral
  if (normalizedModelName.includes("deepseek")) return "DeepSeek"
  if (normalizedModelName.includes("mistral")) return "Mistral"
  if (normalizedModelName.includes("codellama")) return "Code Llama"
  if (normalizedModelName.includes("codegemma")) return "CodeGemma"

  // Then check family names - Map common Ollama family names to our format
  // Check more specific patterns first to avoid false matches
  if (normalizedFamily.includes("deepseek") || normalizedFamily === "deepseek") return "DeepSeek"
  if (normalizedFamily.includes("mistral") || normalizedFamily === "mistral") return "Mistral"
  if (normalizedFamily.includes("llama") || normalizedFamily === "llama") return "Llama"
  if (normalizedFamily.includes("qwen") || normalizedFamily === "qwen") return "Qwen"
  if (normalizedFamily.includes("phi") || normalizedFamily === "phi") return "Phi"
  if (normalizedFamily.includes("gemma") || normalizedFamily === "gemma") return "Gemma"
  if (normalizedFamily.includes("starcoder") || normalizedFamily === "starcoder") return "StarCoder"
  if (normalizedFamily.includes("wizardcoder") || normalizedFamily === "wizardcoder") return "WizardCoder"
  if (normalizedFamily.includes("solar") || normalizedFamily === "solar") return "Solar"
  if (normalizedFamily.includes("yi") || normalizedFamily === "yi") return "Yi"
  if (normalizedFamily.includes("openchat") || normalizedFamily === "openchat") return "OpenChat"
  if (normalizedFamily.includes("vicuna") || normalizedFamily === "vicuna") return "Vicuna"
  if (normalizedFamily.includes("orca") || normalizedFamily === "orca") return "Orca"

  // If no match, return the capitalized version
  return family.charAt(0).toUpperCase() + family.slice(1)
}

function extractFamilyFromName(modelName: string): string {
  const name = modelName.toLowerCase()
  // Check more specific patterns first to avoid false matches
  if (name.includes("codellama")) return "Code Llama"
  if (name.toLowerCase().includes("codegemma")) return "CodeGemma"
  if (name.toLowerCase().includes("deepseek")) return "DeepSeek"
  if (name.includes("llama")) return "Llama"
  if (name.includes("qwen")) return "Qwen"
  if (name.includes("mistral")) return "Mistral"
  if (name.includes("phi")) return "Phi"
  if (name.includes("gemma")) return "Gemma"
  if (name.includes("starcoder")) return "StarCoder"
  if (name.includes("wizardcoder")) return "WizardCoder"
  if (name.includes("solar")) return "Solar"
  if (name.includes("yi")) return "Yi"
  if (name.includes("openchat")) return "OpenChat"
  if (name.includes("vicuna")) return "Vicuna"
  if (name.includes("orca")) return "Orca"
  return "Unknown"
}

function extractSizeFromName(modelName: string): string {
  const sizeMatch = modelName.match(/(\d+\.?\d*)[bB]/i)
  return sizeMatch ? `${sizeMatch[1]}B` : "Unknown"
}

function getProviderFromFamily(family: string): string {
  switch (family) {
    case "Llama":
      return "Meta"
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
      return "ollama"
  }
}

function generateTags(
  modelName: string,
  family: string,
  parameterSize: string,
  sizeInGB: number
): string[] {
  const tags = ["local", "open-source"]

  // Add size-based tags
  if (sizeInGB < 2) tags.push("lightweight")
  if (sizeInGB < 5) tags.push("fast")
  if (sizeInGB > 20) tags.push("large")

  // Add parameter size tag
  if (parameterSize !== "Unknown") tags.push(parameterSize.toLowerCase())

  // Add capability tags
  const name = modelName.toLowerCase()
  if (name.includes("code") || name.includes("coder")) tags.push("coding")
  if (name.includes("instruct") || name.includes("chat")) tags.push("chat")
  if (name.includes("vision") || name.includes("visual")) tags.push("vision")
  if (name.includes("math")) tags.push("math")

  return tags
}

function estimateContextWindow(family: string, modelName: string): number {
  const name = modelName.toLowerCase()

  // Check for explicit context window indicators
  if (name.includes("32k")) return 32768
  if (name.includes("128k")) return 131072
  if (name.includes("1m")) return 1048576

  // Family-based estimates
  switch (family) {
    case "Llama":
      return name.includes("3.2") || name.includes("3.1") ? 128000 : 4096
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
      return 4096
  }
}

function checkVisionCapability(modelName: string, family: string): boolean {
  const name = modelName.toLowerCase()
  return (
    name.includes("vision") ||
    name.includes("visual") ||
    name.includes("video") ||
    (family === "Llama" && (name.includes("3.2") || name.includes("3.1"))) ||
    (family === "Qwen" && (name.includes("2.5") || name.includes("vl"))) ||
    (family === "DeepSeek" && name.includes("vl")) ||
    name.includes("multimodal") ||
    name.includes("mm")
  )
}

function checkReasoningCapability(family: string): boolean {
  // Most modern model families have reasoning capabilities
  return ["Llama", "Qwen", "DeepSeek", "Mistral", "Phi"].includes(family)
}

function estimateSpeed(
  parameterSize: string,
  sizeInGB: number
): "Fast" | "Medium" | "Slow" {
  if (sizeInGB < 5) return "Fast"
  if (sizeInGB < 15) return "Medium"
  return "Slow"
}

function estimateIntelligence(
  family: string,
  parameterSize: string
): "Low" | "Medium" | "High" {
  const sizeNum = parseFloat(parameterSize.replace(/[^0-9.]/g, ""))

  if (isNaN(sizeNum)) return "Medium"

  // Size-based intelligence estimation
  if (sizeNum < 3) return "Medium"
  if (sizeNum < 8) return "High"
  return "High"
}

function formatModelName(modelName: string): string {
  // Convert model name to a more readable format
  return modelName
    .split(":")[0] // Remove tag part
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Static fallback models for when Ollama is not available
const staticOllamaModels: ModelConfig[] = [
  {
    id: "llama3.1:latest",
    name: "Llama 3.1 Latest",
    provider: "Meta",
    providerId: "ollama",
    modelFamily: "Llama 3.1",
    baseProviderId: "meta",
    description: "Latest Llama 3.1 model running locally via Ollama",
    tags: ["local", "open-source", "fast", "8b"],
    contextWindow: 128000,
    inputCost: 0.0,
    outputCost: 0.0,
    priceUnit: "free (local)",
    vision: false,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: true,
    speed: "Fast",
    intelligence: "High",
    website: "https://ollama.com",
    apiDocs: "https://github.com/ollama/ollama/blob/main/docs/api.md",
    modelPage: "https://ollama.com/library/llama3.1",
    icon: "meta",
    apiSdk: (apiKey?: string) =>
      openproviders("llama3.1:latest" as string, undefined, apiKey),
  },
  {
    id: "qwen3:8b",
    name: "Qwen3 8B",
    provider: "Alibaba",
    providerId: "ollama",
    modelFamily: "Qwen3",
    baseProviderId: "alibaba",
    description: "Qwen3 8B model running locally via Ollama",
    tags: ["local", "open-source", "fast", "8b", "multilingual"],
    contextWindow: 32768,
    inputCost: 0.0,
    outputCost: 0.0,
    priceUnit: "free (local)",
    vision: false,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: true,
    speed: "Fast",
    intelligence: "High",
    website: "https://ollama.com",
    apiDocs: "https://github.com/ollama/ollama/blob/main/docs/api.md",
    modelPage: "https://ollama.com/library/qwen3",
    icon: "qwen",
    apiSdk: (apiKey?: string) =>
      openproviders("qwen3:8b" as string, undefined, apiKey),
  },
  {
    id: "qwen2.5-coder:latest",
    name: "Qwen 2.5 Coder",
    provider: "Alibaba",
    providerId: "ollama",
    modelFamily: "Qwen 2.5",
    baseProviderId: "alibaba",
    description:
      "Specialized coding model based on Qwen 2.5, optimized for programming tasks",
    tags: ["local", "open-source", "coding", "7b"],
    contextWindow: 32768,
    inputCost: 0.0,
    outputCost: 0.0,
    priceUnit: "free (local)",
    vision: false,
    tools: true,
    audio: false,
    reasoning: true,
    openSource: true,
    speed: "Fast",
    intelligence: "High",
    website: "https://ollama.com",
    apiDocs: "https://github.com/ollama/ollama/blob/main/docs/api.md",
    modelPage: "https://ollama.com/library/qwen2.5-coder",
    icon: "qwen",
    apiSdk: (apiKey?: string) =>
      openproviders("qwen2.5-coder:latest" as string, undefined, apiKey),
  },
]

// Export function to get Ollama models
export async function getOllamaModels(): Promise<ModelConfig[]> {
  const detectedModels = await detectOllamaModels()

  if (detectedModels.length > 0) {
    console.info(`Detected ${detectedModels.length} Ollama models`)
  } else {
    console.info("No Ollama models detected - server may not be running")
  }

  return detectedModels
}

// For backward compatibility, export static models
export const ollamaModels = staticOllamaModels
