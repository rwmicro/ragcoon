import { uploadFile, ingestUrl, query } from "../api/rag"

// Capture the request the client builds so we can assert on the FormData /
// JSON payloads produced by the shared helpers.
function mockFetchOk(json: unknown = { success: true }) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as Response)
  global.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

function formDataToObject(body: unknown): Record<string, string> {
  const fd = body as FormData
  const out: Record<string, string> = {}
  for (const [k, v] of fd.entries()) {
    out[k] = typeof v === "string" ? v : (v as File).name
  }
  return out
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe("uploadFile", () => {
  it("includes the file and only the provided options, mapping embedding_model -> embedding_model_name", async () => {
    const fetchMock = mockFetchOk()
    const file = new File(["x"], "doc.pdf")

    await uploadFile({
      file,
      collection_title: "Docs",
      chunk_size: 800,
      embedding_model: "nomic-embed",
      use_hybrid_embedding: true,
    })

    const [, init] = fetchMock.mock.calls[0]
    const fields = formDataToObject(init.body)

    expect(fields.file).toBe("doc.pdf")
    expect(fields.collection_title).toBe("Docs")
    expect(fields.chunk_size).toBe("800")
    expect(fields.embedding_model_name).toBe("nomic-embed")
    expect(fields.use_hybrid_embedding).toBe("true")
    // not provided -> must be absent
    expect(fields.reranker_model).toBeUndefined()
    expect(fields.llm_model).toBeUndefined()
  })
})

describe("ingestUrl", () => {
  it("sends the url and the collection title once", async () => {
    const fetchMock = mockFetchOk()

    await ingestUrl({
      url: "https://example.com",
      collection_title: "Web",
      chunk_overlap: 50,
    })

    const [endpoint, init] = fetchMock.mock.calls[0]
    expect(String(endpoint)).toContain("/ingest/url")

    const fields = formDataToObject(init.body)
    expect(fields.url).toBe("https://example.com")
    expect(fields.collection_title).toBe("Web")
    expect(fields.chunk_overlap).toBe("50")
  })
})

describe("query", () => {
  it("POSTs JSON and throws a descriptive error on failure", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: async () => "backend exploded",
    } as Response) as unknown as typeof fetch

    await expect(
      query({ query: "hi", collection_id: "c1" })
    ).rejects.toThrow(/backend exploded/)
  })
})
