import {
  isSupportedFolderFile,
  createFileUploadItems,
  createUrlUploadItem,
  resolveChunkingStrategy,
  mapEnvConfigToExtended,
  DEFAULT_EXTENDED_RETRIEVAL,
  DEFAULT_EXTENDED_INGESTION,
  DEFAULT_BACKEND_CONFIG,
  MAX_TOKENS_FOR_LENGTH,
} from "../dashboard-utils"

describe("isSupportedFolderFile", () => {
  it("accepts supported extensions case-insensitively", () => {
    expect(isSupportedFolderFile("doc.pdf")).toBe(true)
    expect(isSupportedFolderFile("README.MD")).toBe(true)
    expect(isSupportedFolderFile("notes.markdown")).toBe(true)
    expect(isSupportedFolderFile("data.CSV")).toBe(true)
    expect(isSupportedFolderFile("data.tsv")).toBe(true)
  })

  it("rejects unsupported extensions", () => {
    expect(isSupportedFolderFile("image.png")).toBe(false)
    expect(isSupportedFolderFile("archive.zip")).toBe(false)
    expect(isSupportedFolderFile("noextension")).toBe(false)
  })
})

describe("resolveChunkingStrategy", () => {
  it("maps the unsupported 'smart' strategy to 'semantic'", () => {
    expect(resolveChunkingStrategy("smart")).toBe("semantic")
  })

  it("passes supported strategies through unchanged", () => {
    expect(resolveChunkingStrategy("semantic")).toBe("semantic")
    expect(resolveChunkingStrategy("recursive")).toBe("recursive")
    expect(resolveChunkingStrategy("markdown")).toBe("markdown")
  })
})

describe("upload item factories", () => {
  it("wraps files into pending file items with unique ids", () => {
    const files = [new File(["a"], "a.pdf"), new File(["b"], "b.md")]
    const items = createFileUploadItems(files)

    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ type: "file", status: "pending", progress: 0 })
    expect(items[0].file.name).toBe("a.pdf")
    expect(items[0].id).not.toBe(items[1].id)
  })

  it("builds a url item carrying the url", () => {
    const item = createUrlUploadItem("https://example.com/docs")
    expect(item).toMatchObject({
      type: "url",
      status: "pending",
      progress: 0,
      url: "https://example.com/docs",
    })
  })
})

describe("MAX_TOKENS_FOR_LENGTH", () => {
  it("increases with verbosity", () => {
    expect(MAX_TOKENS_FOR_LENGTH.concise).toBeLessThan(MAX_TOKENS_FOR_LENGTH.balanced)
    expect(MAX_TOKENS_FOR_LENGTH.balanced).toBeLessThan(MAX_TOKENS_FOR_LENGTH.detailed)
  })
})

describe("mapEnvConfigToExtended", () => {
  const current = {
    retrieval: DEFAULT_EXTENDED_RETRIEVAL,
    ingestion: DEFAULT_EXTENDED_INGESTION,
    backend: DEFAULT_BACKEND_CONFIG,
  }

  it("keeps current values when the backend omits a field", () => {
    const result = mapEnvConfigToExtended({}, current)
    expect(result).toEqual(current)
  })

  it("coerces numeric and boolean fields from the payload", () => {
    const result = mapEnvConfigToExtended(
      {
        other: { INITIAL_RETRIEVAL_K: "75", MAX_WORKERS: "8" },
        retrieval: { HYBRID_ALPHA: "0.4", MIN_SIMILARITY_SCORE: "0.5" },
        embedding: { EMBEDDING_DEVICE: "cpu", NORMALIZE_EMBEDDINGS: false },
        reranking: { RERANKER_MODEL: "custom/model" },
      },
      current
    )

    expect(result.retrieval.initialRetrievalK).toBe(75)
    expect(result.retrieval.hybridAlpha).toBeCloseTo(0.4)
    expect(result.backend.maxWorkers).toBe(8)
    expect(result.backend.minSimilarityScore).toBeCloseTo(0.5)
    expect(result.backend.embeddingDevice).toBe("cpu")
    expect(result.backend.normalizeEmbeddings).toBe(false)
    expect(result.ingestion.rerankerModel).toBe("custom/model")
  })

  it("does not mutate the provided current settings", () => {
    const snapshot = JSON.parse(JSON.stringify(current))
    mapEnvConfigToExtended({ other: { MAX_WORKERS: 4 } }, current)
    expect(current).toEqual(snapshot)
  })
})
