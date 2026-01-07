import type { UserProfile } from "@/lib/user/types"
import { fetchClient } from "./fetch"
import { API_ROUTE_CREATE_GUEST, API_ROUTE_UPDATE_CHAT_MODEL } from "./routes"

/**
 * Creates a guest user record on the server
 */
export async function createGuestUser(guestId: string) {
  try {
    const res = await fetchClient(API_ROUTE_CREATE_GUEST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: guestId }),
    })
    const responseData = await res.json()
    if (!res.ok) {
      throw new Error(
        responseData.error ||
        `Failed to create guest user: ${res.status} ${res.statusText}`
      )
    }

    return responseData
  } catch (err) {
    console.error("Error creating guest user:", err)
    throw err
  }
}


/**
 * Updates the model for an existing chat
 */
export async function updateChatModel(chatId: string, model: string) {
  try {
    const res = await fetchClient(API_ROUTE_UPDATE_CHAT_MODEL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, model }),
    })
    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(
        responseData.error ||
        `Failed to update chat model: ${res.status} ${res.statusText}`
      )
    }

    return responseData
  } catch (error) {
    console.error("Error updating chat model:", error)
    throw error
  }
}


export const getOrCreateGuestUserId = async (
  user: UserProfile | null
): Promise<string | null> => {
  // Always return 'local-user' for single-user local mode
  return 'local-user'
}

// --- RAG API ---

const RAG_API_BASE = "http://localhost:8001"

export interface RAGSource {
  filename: string
  chunkIndex: number
  pageNumber?: number
  content: string
  score: number
}

export interface QueryParams {
  query: string
  collection_id?: string
  conversation_history?: any[]
  top_k?: number
  use_hybrid_search?: boolean
  use_reranking?: boolean
  use_multi_query?: boolean
  use_hyde?: boolean
  use_graph_rag?: boolean
  auto_route?: boolean
  [key: string]: any
}

export async function queryStream(
  params: QueryParams,
  onChunk: (text: string) => void,
  onSources: (sources: RAGSource[]) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal
) {
  try {
    const response = await fetch(`${RAG_API_BASE}/query/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    })

    if (!response.ok) {
      throw new Error(`RAG API Error: ${response.status} ${response.statusText}`)
    }

    if (!response.body) return

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = "" // Buffer for incomplete lines

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      // Split by newlines, but keep the last incomplete line in the buffer
      const lines = buffer.split("\n")
      buffer = lines.pop() || "" // Keep last incomplete line in buffer

      for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue

        console.log('[SSE Debug] Raw line:', line.substring(0, 100))

        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          console.log('[SSE Debug] Extracted data:', data.substring(0, 100))

          if (data === "[DONE]") continue

          // Check for sources marker
          if (data.includes("<!-- RAG_SOURCES:")) {
            const sourcesMatch = data.match(/<!-- RAG_SOURCES:(.*?) -->/)
            if (sourcesMatch) {
              try {
                // The sources are base64 encoded in the marker
                const sourcesJson = atob(sourcesMatch[1])
                const sources = JSON.parse(sourcesJson)
                onSources(sources)
              } catch (e) {
                console.error("Failed to parse sources:", e)
              }
            }
          } else {
            // Regular text chunk
            // Clean up any potential source markers if they leak into text (defensive)
            const cleanText = data.replace(/<!-- RAG_SOURCES:.*? -->/g, "")
            if (!cleanText.trim()) {
              // Skip empty lines
              continue
            }

            // Try to parse as JSON first
            try {
              const json = JSON.parse(data)

              // Filter out status messages - only process content chunks
              if (json.type === "status") {
                // Skip status messages (started, retrieving, reranking, generating, completed, etc.)
                // Log for debugging if needed
                console.log('[RAG Status]', json.status, json.message)
                continue
              }

              // Handle content chunks
              // JSON parsing preserves newlines correctly (e.g., "hello\nworld" becomes a real newline)
              if (json.token) {
                onChunk(json.token)  // Newlines preserved from backend JSON
              } else if (json.content) {
                onChunk(json.content)  // Newlines preserved from backend JSON
              } else if (json.type === "content") {
                // Some backends send { type: "content", data: "..." }
                onChunk(json.data || json.text || "")
              }
              // Ignore other JSON messages that don't have recognizable content
            } catch {
              // Not JSON, treat as raw text (this is the LLM response)
              onChunk(cleanText)
            }
          }
        } else {
          // Line doesn't start with "data: " - this should be raw LLM output
          // In SSE format, all data should start with "data: ", but some backends
          // might send raw text for LLM chunks
          const cleanLine = line.replace(/<!-- RAG_SOURCES:.*? -->/g, "").trim()
          if (cleanLine) {
            onChunk(cleanLine)
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Ignore abort errors
      return
    }
    onError(error instanceof Error ? error : new Error(String(error)))
  }
}
