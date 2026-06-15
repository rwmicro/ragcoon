import { retryWithBackoff, isRetryableHTTPError } from "../retry"

describe("retryWithBackoff", () => {
  it("returns immediately on first success without retrying", async () => {
    const fn = jest.fn().mockResolvedValue("ok")
    const result = await retryWithBackoff(fn, 3, 1, 2)
    expect(result).toBe("ok")
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("retries until success", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue("recovered")

    // tiny delays to keep the test fast
    const result = await retryWithBackoff(fn, 3, 1, 2)
    expect(result).toBe("recovered")
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it("throws the last error after exhausting retries", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("always fails"))
    await expect(retryWithBackoff(fn, 2, 1, 2)).rejects.toThrow("always fails")
    // initial attempt + 2 retries
    expect(fn).toHaveBeenCalledTimes(3)
  })
})

describe("isRetryableHTTPError", () => {
  it("retries on 5xx and 429 responses", () => {
    expect(isRetryableHTTPError(new Response(null, { status: 500 }))).toBe(true)
    expect(isRetryableHTTPError(new Response(null, { status: 503 }))).toBe(true)
    expect(isRetryableHTTPError(new Response(null, { status: 429 }))).toBe(true)
  })

  it("does not retry on 4xx (other than 429)", () => {
    expect(isRetryableHTTPError(new Response(null, { status: 400 }))).toBe(false)
    expect(isRetryableHTTPError(new Response(null, { status: 404 }))).toBe(false)
  })

  it("retries on network-ish errors", () => {
    expect(isRetryableHTTPError(new Error("fetch failed"))).toBe(true)
    expect(isRetryableHTTPError(new Error("network timeout"))).toBe(true)
    expect(isRetryableHTTPError(new Error("ECONNRESET"))).toBe(true)
  })

  it("does not retry on arbitrary errors", () => {
    expect(isRetryableHTTPError(new Error("bad input"))).toBe(false)
    expect(isRetryableHTTPError("nope")).toBe(false)
  })
})
