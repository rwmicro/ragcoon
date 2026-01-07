import { tool } from "ai"
import { z } from "zod"

/**
 * Web Search Tool
 *
 * Enables AI models to search the web for current information.
 * Uses a search API (DuckDuckGo, Brave, or custom) to fetch results.
 */

// Get search provider from environment
const getSearchProvider = () => {
  // For now, use DuckDuckGo HTML scraping as a simple fallback
  // Can be extended to use Brave Search API, Serper, etc.
  return process.env.SEARCH_PROVIDER || 'duckduckgo'
}

// Perform actual DuckDuckGo HTML scraping
async function searchDuckDuckGo(query: string, maxResults: number = 5): Promise<Array<{ title: string; url: string; snippet: string; content?: string }>> {
  console.log(`[Web Search] Searching DuckDuckGo for: "${query}"`)

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed: ${response.status}`)
    }

    const html = await response.text()

    // Parse DuckDuckGo HTML results
    const results: Array<{ title: string; url: string; snippet: string; content?: string }> = []

    // Extract search results using regex (DuckDuckGo HTML structure)
    const resultRegex = /<div class="result__body">[\s\S]*?<a.*?href="([^"]+)".*?>(.*?)<\/a>[\s\S]*?<a class="result__snippet".*?>(.*?)<\/a>/g

    let match
    while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
      const url = decodeHTMLEntities(match[1])
      const title = decodeHTMLEntities(match[2].replace(/<[^>]+>/g, ''))
      const snippet = decodeHTMLEntities(match[3].replace(/<[^>]+>/g, ''))

      // Skip if URL is empty or invalid
      if (!url || url.startsWith('//') || !url.startsWith('http')) continue

      results.push({ title, url, snippet })
    }

    console.log(`[Web Search] Found ${results.length} search results, now fetching page content...`)

    // Fetch full page content for each result
    const resultsWithContent = await Promise.all(
      results.map(async (result) => {
        console.log(`[Web Search] Fetching content from: ${result.url}`)
        const content = await fetchPageContent(result.url)
        return {
          ...result,
          content: content || result.snippet // Fall back to snippet if content fetch fails
        }
      })
    )

    return resultsWithContent

  } catch (error) {
    console.error('[Web Search] DuckDuckGo search failed:', error)
    // Return empty array instead of mock data
    return []
  }
}

// Helper to decode HTML entities
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  }

  return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity)
}

// Fetch and extract page content
async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // Timeout after 8 seconds
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) {
      console.log(`[Web Search] Failed to fetch ${url}: ${response.status}`)
      return ''
    }

    const html = await response.text()

    // Extract main content more intelligently
    let text = html
      // Remove scripts and styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove common non-content elements
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      // Try to extract main content if available
      .replace(/[\s\S]*<main[^>]*>([\s\S]*)<\/main>[\s\S]*/, '$1')
      .replace(/[\s\S]*<article[^>]*>([\s\S]*)<\/article>[\s\S]*/, '$1')

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, ' ')

    // Clean up whitespace and decode entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()

    // Extract the most relevant content (first 2000 chars for better context)
    const content = text.substring(0, 2000)

    console.log(`[Web Search] Extracted ${content.length} chars from ${url}`)
    return content

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log(`[Web Search] Timeout fetching ${url}`)
      } else {
        console.log(`[Web Search] Error fetching ${url}: ${error.message}`)
      }
    }
    return ''
  }
}

export const webSearchTool = tool({
  description: 'Search the web for current information, news, facts, or any topic that requires up-to-date knowledge. Use this when the user asks about recent events, current information, or anything you don\'t have knowledge about.',
  parameters: z.object({
    query: z.string().describe('The search query - be specific and concise'),
    // Use coerce to handle both string and number inputs from LLMs
    maxResults: z.coerce.number().optional().default(5).describe('Maximum number of results to return (1-10)'),
  }),
  execute: async ({ query, maxResults = 5 }) => {
    console.log(`[Web Search] ============ TOOL CALLED ============`)
    console.log(`[Web Search] Query: "${query}"`)
    console.log(`[Web Search] Max Results: ${maxResults}`)

    try {
      // Perform search
      const results = await searchDuckDuckGo(query, Math.min(maxResults, 10))
      console.log(`[Web Search] Got ${results.length} results`)

      if (results.length === 0) {
        return {
          success: false,
          message: 'No results found for this query.',
          results: []
        }
      }

      console.log(`[Web Search] Returning ${results.length} results with full page content`)

      // Format results for the model - include full scraped content
      return {
        success: true,
        query: query,
        results: results.map((result, index) => ({
          position: index + 1,
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          content: result.content || result.snippet, // Full page content
          content_length: result.content?.length || result.snippet.length
        })),
        summary: `Found ${results.length} results for "${query}" with full page content scraped from each URL`
      }
    } catch (error) {
      console.error('[Web Search] Error:', error)
      return {
        success: false,
        message: 'Failed to perform web search. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
})

export const webSearchTools = {
  web_search: webSearchTool
}
