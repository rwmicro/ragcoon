import { tool } from "ai"
import { z } from "zod"
import { tavily } from "@tavily/core"

const getClient = () => {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error("TAVILY_API_KEY environment variable is not set")
  return tavily({ apiKey })
}

export const webSearchTool = tool({
  description:
    "Search the web for current information, news, facts, or any topic that requires up-to-date knowledge. Use this when the user asks about recent events, current information, or anything you don't have knowledge about.",
  parameters: z.object({
    query: z.string().describe("The search query — be specific and concise"),
    maxResults: z.coerce
      .number()
      .optional()
      .default(5)
      .describe("Maximum number of results to return (1-10)"),
  }),
  execute: async ({ query, maxResults = 5 }) => {
    try {
      const client = getClient()

      const response = await client.search(query, {
        maxResults: Math.min(maxResults, 10),
        searchDepth: "basic",
        includeAnswer: true,
      })

      if (!response.results || response.results.length === 0) {
        return {
          success: false,
          message: "No results found for this query.",
          results: [],
        }
      }

      return {
        success: true,
        query,
        answer: response.answer ?? null,
        results: response.results.map((result, index) => ({
          position: index + 1,
          title: result.title,
          url: result.url,
          content: result.content,
          score: result.score,
        })),
      }
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to perform web search.",
      }
    }
  },
})

export const webPageReaderTool = tool({
  description:
    "Read and extract the full content of a web page from a given URL. Use this when the user provides a URL and wants to know what's on the page, or when you need to read the full content of a specific page found in search results.",
  parameters: z.object({
    url: z.string().url().describe("The full URL of the web page to read"),
  }),
  execute: async ({ url }) => {
    try {
      const client = getClient()

      const response = await client.extract([url], {
        extractDepth: "basic",
      })

      if (response.failedResults.length > 0 && response.results.length === 0) {
        return {
          success: false,
          message: `Failed to read page: ${response.failedResults[0].error}`,
        }
      }

      const result = response.results[0]
      // Truncate content to avoid overwhelming the context window
      const maxLength = 8000
      const content = result.rawContent.length > maxLength
        ? result.rawContent.slice(0, maxLength) + "\n\n[Content truncated...]"
        : result.rawContent

      return {
        success: true,
        url: result.url,
        title: result.title,
        content,
      }
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to read web page.",
      }
    }
  },
})

export const webSearchTools = {
  web_search: webSearchTool,
}

export const pageReaderTools = {
  read_page: webPageReaderTool,
}
