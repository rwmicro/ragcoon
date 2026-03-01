import type { Message as MessageAISDK } from "@ai-sdk/react"
import type { WebSource } from "./web-source-bubbles"

export function getWebSources(parts: MessageAISDK["parts"]): WebSource[] {
  const sources: WebSource[] = []

  parts?.forEach((part) => {
    if (part.type !== "tool-invocation" || part.toolInvocation.state !== "result") return

    const { toolName, result } = part.toolInvocation

    if (toolName === "web_search" && result?.results) {
      result.results.forEach((r: { url: string; title: string }) => {
        if (r.url) sources.push({ url: r.url, title: r.title || r.url })
      })
    }

    if (toolName === "read_page" && result?.url) {
      sources.push({ url: result.url, title: result.title || result.url })
    }
  })

  return sources
}

export function getSources(parts: MessageAISDK["parts"]) {
  const sources = parts
    ?.filter(
      (part) => part.type === "source" || part.type === "tool-invocation"
    )
    .map((part) => {
      if (part.type === "source") {
        return part.source
      }

      if (
        part.type === "tool-invocation" &&
        part.toolInvocation.state === "result"
      ) {
        const result = part.toolInvocation.result

        if (
          part.toolInvocation.toolName === "summarizeSources" &&
          result?.result?.[0]?.citations
        ) {
          return result.result.flatMap((item: { citations?: unknown[] }) => item.citations || [])
        }

        return Array.isArray(result) ? result.flat() : result
      }

      return null
    })
    .filter(Boolean)
    .flat()

  const validSources =
    sources?.filter(
      (source) =>
        source && typeof source === "object" && source.url && source.url !== ""
    ) || []

  return validSources
}
