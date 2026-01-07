import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { getAllModels } from "@/lib/models"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import { webSearchTools } from "@/lib/tools/web-search"
import { Attachment } from "@ai-sdk/ui-utils"
import { Message as MessageAISDK, streamText, ToolSet } from "ai"
import {
  incrementMessageCount,
  logUserMessage,
  storeAssistantMessage,
  validateAndTrackUsage,
} from "./api"
import { createErrorResponse, extractErrorMessage } from "./utils"

export const maxDuration = 60

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: string
  userId: string
  model: string
  isAuthenticated: boolean
  systemPrompt: string
  enableSearch: boolean
  message_group_id?: string
  // AI Settings (optional)
  aiSettings?: {
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
    enableWebSearch?: boolean
    // Advanced RAG features
    enableGraphRAG?: boolean
    graphExpansionDepth?: number
    graphAlpha?: number
    enableHyDE?: boolean
    hydeFusion?: "average" | "max" | "rrf"
    numHypotheticalDocs?: number
    enableMultiQuery?: boolean
    numQueryVariations?: number
  }
}

export async function POST(req: Request) {
  // Rate limiting (disabled for local-only usage)
  // Enable by setting ENABLE_RATE_LIMITING=true in .env
  if (process.env.ENABLE_RATE_LIMITING === 'true') {
    const { rateLimiter, RATE_LIMITS, getClientIdentifier, createRateLimitResponse } = await import('@/lib/rate-limiter')
    const clientId = getClientIdentifier(req)
    const rateLimit = rateLimiter.check(clientId, RATE_LIMITS.CHAT.maxRequests, RATE_LIMITS.CHAT.windowMs)

    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for client: ${clientId}`)
      return createRateLimitResponse(rateLimit.resetTime)
    }
  }

  try {
    const {
      messages: rawMessages,
      chatId,
      userId,
      model,
      isAuthenticated,
      systemPrompt,
      enableSearch,
      message_group_id,
      aiSettings,
    } = (await req.json()) as ChatRequest

    if (!rawMessages || !chatId || !userId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    // Clean all messages upfront to remove any tool_result parts that might cause issues
    // This is critical because the AI SDK validation is very strict
    const messages = rawMessages.map(msg => {
      if (typeof msg.content === 'string') {
        return msg
      }

      if (Array.isArray(msg.content)) {
        const cleanedParts = (msg.content as any[]).filter((part: any) => {
          // Completely remove tool_result parts - they often cause validation errors
          if (part.type === 'tool_result') {
            console.warn('[Chat API] Filtering out tool_result part from message:', msg.id)
            return false
          }
          return true
        })

        // If no parts remain, convert to empty string
        if (cleanedParts.length === 0) {
          return {
            ...msg,
            content: ''
          }
        }

        return {
          ...msg,
          content: cleanedParts
        }
      }

      return msg
    })

    const validation = await validateAndTrackUsage({
      userId,
      model,
      isAuthenticated,
    })

    // Increment message count for successful validation
    if (validation) {
      await incrementMessageCount({ validation, userId })
    }

    const userMessage = messages[messages.length - 1]

    // Always log user message (function handles both validation and SQLite)
    if (userMessage?.role === "user") {
      // Convert content to string if it's an array
      const contentStr = typeof userMessage.content === 'string'
        ? userMessage.content
        : Array.isArray(userMessage.content)
          ? userMessage.content.map((part: any) => typeof part === 'string' ? part : part.text || '').join('')
          : ''

      await logUserMessage({
        validation,
        userId,
        chatId,
        content: contentStr,
        attachments: userMessage.experimental_attachments as Attachment[],
        model,
        isAuthenticated,
        message_group_id,
      })
    }

    const allModels = await getAllModels()
    const modelConfig = allModels.find((m) => m.id === model)

    console.log(`Looking for model: ${model}`)
    console.log(`Available models: ${allModels.map(m => m.id).join(', ')}`)
    console.log(`Model found: ${!!modelConfig}`)
    console.log(`Model config apiSdk: ${!!modelConfig?.apiSdk}`)

    if (!modelConfig) {
      console.error(`Model ${model} not found in available models`)
      throw new Error(`Model ${model} not found`)
    }

    // RAG model handling - proxy to Python backend
    if (modelConfig.isRAG || model.startsWith('rag:')) {
      console.log('[RAG] Handling RAG query via Python backend')

      const userMessage = messages[messages.length - 1]
      const query = typeof userMessage.content === 'string'
        ? userMessage.content
        : Array.isArray(userMessage.content)
          ? userMessage.content.map(part => typeof part === 'string' ? part : part.text || '').join('')
          : ''

      // Extract conversation history (excluding the current user message)
      const conversationHistory = messages.slice(0, -1).map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string'
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.map(part => typeof part === 'string' ? part : part.text || '').join('')
            : ''
      }))

      console.log('[RAG] Query:', query.substring(0, 100))
      console.log('[RAG] Conversation history:', conversationHistory.length, 'messages')

      // Create streaming response from Python backend
      const encoder = new TextEncoder()
      let fullAnswer = ''
      let ragSources: any[] = []

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Determine collection_id from model name or use default
            let collectionId: string | null = null
            if (model.startsWith('rag:')) {
              // Extract collection ID from model name (e.g., "rag:pensine" -> "pensine")
              collectionId = model.split(':')[1]
              console.log('[RAG] Using collection from model name:', collectionId)
            } else {
              // Fetch available collections and use the first one
              try {
                const collectionsResponse = await fetch('http://127.0.0.1:8001/collections')
                if (collectionsResponse.ok) {
                  const collectionsData = await collectionsResponse.json()
                  if (collectionsData.collections && collectionsData.collections.length > 0) {
                    collectionId = collectionsData.collections[0].id
                    console.log('[RAG] Using first available collection:', collectionId)
                  }
                }
              } catch (error) {
                console.warn('[RAG] Could not fetch collections:', error)
              }
            }

            // Fetch RAG stats to get the configured LLM model
            const statsResponse = await fetch('http://127.0.0.1:8001/stats')
            const stats = statsResponse.ok ? await statsResponse.json() : {}
            const configuredLlmModel = stats.llm_model || 'llama3.1:8b' // fallback to default

            console.log('[RAG] Using configured LLM model:', configuredLlmModel)
            console.log('[RAG] Using collection_id:', collectionId || 'none (global)')

            // Call Python backend streaming API
            const pythonResponse = await fetch('http://127.0.0.1:8001/query/stream', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query: query,
                conversation_history: conversationHistory,
                collection_id: collectionId,
                top_k: 10,
                use_hybrid_search: true,
                use_multi_query: aiSettings?.enableMultiQuery ?? false,
                num_query_variations: aiSettings?.numQueryVariations ?? 2,
                use_reranking: true,
                use_compression: false,
                use_graph_rag: aiSettings?.enableGraphRAG ?? false,
                graph_expansion_depth: aiSettings?.graphExpansionDepth ?? 1,
                graph_alpha: aiSettings?.graphAlpha ?? 0.7,
                use_hyde: aiSettings?.enableHyDE ?? false,
                hyde_fusion: aiSettings?.hydeFusion ?? "rrf",
                num_hypothetical_docs: aiSettings?.numHypotheticalDocs ?? 3,
                use_adaptive_fusion: false,
                system_prompt: systemPrompt,
                stream: true,
              }),
            })

            if (!pythonResponse.ok) {
              throw new Error(`Python backend error: ${pythonResponse.statusText}`)
            }

            // Stream the response
            const reader = pythonResponse.body?.getReader()
            if (!reader) {
              throw new Error('No response body from Python backend')
            }

            const decoder = new TextDecoder()
            let buffer = "" // Buffer for incomplete SSE lines

            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              buffer += chunk

              // Split by newlines, keep last incomplete line in buffer
              const lines = buffer.split("\n")
              buffer = lines.pop() || ""

              for (const line of lines) {
                // Skip empty lines
                if (!line.trim()) continue

                // Parse SSE format: "data: ..."
                if (line.startsWith("data: ")) {
                  const data = line.slice(6)
                  if (data === "[DONE]") continue

                  // Try to parse as JSON (status messages, sources, or content)
                  try {
                    const json = JSON.parse(data)

                    // Handle sources event
                    if (json.type === "sources") {
                      console.log('[RAG] Received sources:', json.sources?.length || 0)
                      ragSources = json.sources || []
                      continue // Don't send sources to stream yet, will attach after completion
                    }

                    // Filter out status messages - only process content
                    if (json.type === "status") {
                      console.log('[RAG Status]', json.status, json.message)
                      continue // Skip status messages
                    }

                    // Handle content chunks
                    // Backend sends: data: {"token": "text\nwith\nnewlines"}
                    // JSON.parse preserves newlines → json.token = "text\nwith\nnewlines"
                    // JSON.stringify escapes them → "text\\nwith\\nnewlines" for AI SDK
                    // AI SDK client will parse and restore newlines correctly
                    if (json.token) {
                      fullAnswer += json.token
                      const streamData = `0:${JSON.stringify(json.token)}\n`
                      controller.enqueue(encoder.encode(streamData))
                    } else if (json.content) {
                      fullAnswer += json.content
                      const streamData = `0:${JSON.stringify(json.content)}\n`
                      controller.enqueue(encoder.encode(streamData))
                    }
                  } catch {
                    // Not JSON, treat as raw text (LLM response)
                    if (data.trim()) {
                      fullAnswer += data
                      const streamData = `0:${JSON.stringify(data)}\n`
                      controller.enqueue(encoder.encode(streamData))
                    }
                  }
                } else {
                  // Line without "data:" prefix - raw LLM output
                  if (line.trim()) {
                    fullAnswer += line
                    const streamData = `0:${JSON.stringify(line)}\n`
                    controller.enqueue(encoder.encode(streamData))
                  }
                }
              }
            }

            // Send sources as custom data annotation if available
            if (ragSources.length > 0) {
              // Use AI SDK's data stream format for custom data
              const sourcesData = JSON.stringify([{ type: 'rag_sources', sources: ragSources }])
              controller.enqueue(encoder.encode(`2:${sourcesData}\n`))
              console.log('[RAG] Sent sources data with', ragSources.length, 'sources')
            }

            controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`))
            controller.close()

            // Store the assistant message
            await storeAssistantMessage({
              validation,
              chatId,
              messages: [{
                role: 'assistant',
                content: fullAnswer,
              }] as any,
              message_group_id,
              model,
            })
            console.log(`[RAG] Message stored successfully`)
          } catch (error) {
            console.error('[RAG] Error in stream:', error)
            const errorMsg = error instanceof Error ? error.message : String(error)
            controller.enqueue(encoder.encode(`3:${JSON.stringify(errorMsg)}\n`))
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1',
        },
      })
    }

    // Regular (non-RAG) model handling
    if (!modelConfig.apiSdk) {
      console.error(`Model ${model} has no apiSdk configured`)
      throw new Error(`Model ${model} configuration error`)
    }

    // Determine which tools to enable based on settings (declare early)
    const shouldEnableWebSearch = aiSettings?.enableWebSearch ?? enableSearch ?? true

    let effectiveSystemPrompt = systemPrompt || SYSTEM_PROMPT_DEFAULT

    // Enhance system prompt when web search is enabled
    if (shouldEnableWebSearch) {
      effectiveSystemPrompt = `${effectiveSystemPrompt}

You have access to a web search tool. Use it when:
- The user asks about current events, news, or recent information
- You need up-to-date facts, statistics, or data
- The user explicitly asks you to search the web
- You're not confident about information that might have changed recently

When using web search:
1. Call the web_search tool with a clear, specific query
2. Analyze the search results carefully
3. Synthesize information from multiple sources when possible
4. Cite sources by mentioning the website names or URLs
5. If results are insufficient, try refining your search query

Important: Always inform the user when you're using web search and cite your sources.`
    }

    // Messages are already cleaned at the top of the function
    let enhancedMessages = messages

    // Ollama doesn't require API keys
    const apiKey: string | undefined = undefined

    // Build tools object
    const tools: ToolSet = {
      ...(shouldEnableWebSearch ? webSearchTools : {}),
    }

    const toolsList = Object.keys(tools)
    console.log(`[Chat API] Tools enabled:`, toolsList.length > 0 ? toolsList.join(', ') : 'NONE')
    console.log(`[Chat API] Web Search: ${shouldEnableWebSearch ? 'YES' : 'NO'}`)

    const result = streamText({
      model: modelConfig.apiSdk(apiKey, { enableSearch: shouldEnableWebSearch }),
      system: effectiveSystemPrompt,
      messages: enhancedMessages as MessageAISDK[],
      tools: tools,
      maxSteps: 10,
      // Apply AI settings
      temperature: aiSettings?.temperature,
      maxTokens: aiSettings?.maxTokens,
      topP: aiSettings?.topP,
      frequencyPenalty: aiSettings?.frequencyPenalty,
      presencePenalty: aiSettings?.presencePenalty,
      onError: (err: unknown) => {
        console.error("Streaming error occurred:", err)
        // Don't set streamError anymore - let the AI SDK handle it through the stream
      },

      onFinish: async ({ response }) => {
        console.log('[Chat API onFinish] Called with response:', {
          messagesCount: response.messages?.length || 0
        })
        response.messages?.forEach((msg, i) => {
          console.log(`[Chat API onFinish] Message ${i}:`, msg.role, typeof msg.content, Array.isArray(msg.content) ? `${msg.content.length} parts` : 'string')
        })

        // Always store assistant message
        await storeAssistantMessage({
          validation,
          chatId,
          messages:
            response.messages as unknown as import("@/app/types/api.types").Message[],
          message_group_id,
          model,
        })
      },
    })

    return result.toDataStreamResponse({
      sendReasoning: true,
      sendSources: true,
      getErrorMessage: (error: unknown) => {
        console.error("Error forwarded to client:", error)
        return extractErrorMessage(error)
      },
    })
  } catch (err: unknown) {
    console.error("Error in /api/chat:", err)
    const error = err as {
      code?: string
      message?: string
      statusCode?: number
    }

    return createErrorResponse(error)
  }
}
