import { getProviderForModel } from "../openproviders/provider-map"

describe("getProviderForModel", () => {
  it("resolves statically-mapped Ollama models", () => {
    expect(getProviderForModel("llama3.1:latest")).toBe("ollama")
    expect(getProviderForModel("qwen3:8b")).toBe("ollama")
  })

  it("recognises Ollama naming patterns", () => {
    expect(getProviderForModel("gemma2:2b")).toBe("ollama")
    expect(getProviderForModel("anything:latest")).toBe("ollama")
    expect(getProviderForModel("kimi-k2-thinking:cloud")).toBe("ollama")
  })

  it("throws for unknown providers", () => {
    expect(() => getProviderForModel("gpt-4o")).toThrow(/Unknown provider/)
  })
})
