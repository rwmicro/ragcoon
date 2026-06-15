import {
  extractFamilyFromId,
  extractSizeFromId,
  estimateContextWindow,
  checkVisionCapability,
  formatModelName,
} from "../models/data/lmstudio"

describe("extractFamilyFromId", () => {
  it("detects known families (most specific first)", () => {
    expect(extractFamilyFromId("codellama-7b-instruct")).toBe("Code Llama")
    expect(extractFamilyFromId("Meta-Llama-3.1-8B")).toBe("Llama")
    expect(extractFamilyFromId("qwen2.5-coder")).toBe("Qwen")
    expect(extractFamilyFromId("DeepSeek-R1-Distill")).toBe("DeepSeek")
    expect(extractFamilyFromId("mixtral-8x7b")).toBe("Mistral")
  })

  it("falls back to Unknown", () => {
    expect(extractFamilyFromId("some-random-model")).toBe("Unknown")
  })
})

describe("extractSizeFromId", () => {
  it("extracts the parameter size", () => {
    expect(extractSizeFromId("llama-3.1-8B")).toBe("8B")
    expect(extractSizeFromId("model-13b-chat")).toBe("13B")
    expect(extractSizeFromId("qwen-1.5b")).toBe("1.5B")
  })

  it("returns null when there is no size", () => {
    expect(extractSizeFromId("plain-model")).toBeNull()
  })
})

describe("estimateContextWindow", () => {
  it("honours explicit context hints in the id", () => {
    expect(estimateContextWindow("Gemma", "gemma-2-9b-32k")).toBe(32768)
    expect(estimateContextWindow("Llama", "model-128k")).toBe(131072)
    expect(estimateContextWindow("Mistral", "model-1m")).toBe(1048576)
  })

  it("estimates from the family otherwise", () => {
    expect(estimateContextWindow("Llama", "llama-3.1-8b")).toBe(128000)
    expect(estimateContextWindow("Qwen", "qwen2.5")).toBe(32768)
    expect(estimateContextWindow("Unknown", "mystery")).toBe(8192)
  })
})

describe("checkVisionCapability", () => {
  it("flags multimodal models", () => {
    expect(checkVisionCapability("llava-1.6")).toBe(true)
    expect(checkVisionCapability("qwen2-vl-7b")).toBe(true)
    expect(checkVisionCapability("moondream2")).toBe(true)
  })

  it("returns false for text-only models", () => {
    expect(checkVisionCapability("llama-3.1-8b")).toBe(false)
  })
})

describe("formatModelName", () => {
  it("strips path, gguf suffix and title-cases", () => {
    expect(formatModelName("TheBloke/Llama-2-7B-GGUF")).toBe("Llama 2 7B")
    expect(formatModelName("qwen2.5-coder")).toBe("Qwen2.5 Coder")
  })
})
