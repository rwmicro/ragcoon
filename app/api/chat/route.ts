import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { getAllModels } from "@/lib/models"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import { getMCPTools } from "@/lib/mcp/client"
import { pageReaderTools, webSearchTools } from "@/lib/tools/web-search"
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

    const userMessage = messages[messages.length - 1]
    const contentStr = typeof userMessage.content === 'string'
      ? userMessage.content
      : Array.isArray(userMessage.content)
        ? userMessage.content.map((part: any) => typeof part === 'string' ? part : part.text || '').join('')
        : ''

    const [allModels] = await Promise.all([
      getAllModels(),
      validation ? incrementMessageCount({ validation, userId }) : Promise.resolve(),
      userMessage?.role === 'user' ? logUserMessage({
        validation,
        userId,
        chatId,
        content: contentStr,
        attachments: userMessage.experimental_attachments as Attachment[],
        model,
        isAuthenticated,
        message_group_id,
      }) : Promise.resolve(),
    ])

    const modelConfig = allModels.find((m) => m.id === model)

    if (!modelConfig) {
      console.error(`Model ${model} not found in available models`)
      throw new Error(`Model ${model} not found`)
    }

    const RAG_API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || "http://127.0.0.1:8001"

    // RAG model handling - proxy to Python backend
    if (modelConfig.isRAG || model.startsWith('rag:')) {

      const userMessage = messages[messages.length - 1]
      const rawQuery = typeof userMessage.content === 'string'
        ? userMessage.content
        : Array.isArray(userMessage.content)
          ? userMessage.content.map(part => typeof part === 'string' ? part : (part as any).text || '').join('')
          : ''

      const query = rawQuery.trim().slice(0, 10_000)
      if (!query) {
        return new Response(
          JSON.stringify({ error: 'Empty query' }),
          { status: 400 }
        )
      }

      // Extract conversation history (excluding the current user message)
      const conversationHistory = messages.slice(0, -1).map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string'
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.map(part => typeof part === 'string' ? part : (part as any).text || '').join('')
            : ''
      }))

      // Create streaming response from Python backend
      const encoder = new TextEncoder()
      let fullAnswer = ''
      let ragSources: any[] = []

      const stream = new ReadableStream({
        async start(controller) {
          let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
          // Abort the Python fetch after 60 s (matches Next.js maxDuration)
          const ragAbort = new AbortController()
          const ragTimeout = setTimeout(() => ragAbort.abort(), 60_000)

          try {
            // Determine collection_id from model name or use default
            let collectionId: string | null = null
            if (model.startsWith('rag:')) {
              collectionId = model.split(':')[1]
            } else {
              // Fetch available collections and use the first one
              try {
                const collectionsResponse = await fetch(`${RAG_API_URL}/collections`, {
                  signal: ragAbort.signal,
                })
                if (collectionsResponse.ok) {
                  const collectionsData = await collectionsResponse.json()
                  if (collectionsData?.collections?.length > 0) {
                    collectionId = collectionsData.collections[0].id
                  }
                }
              } catch (error) {
                console.warn('[RAG] Could not fetch collections:', error)
              }
            }

            // Fetch RAG stats to get the configured LLM model
            let stats: Record<string, unknown> = {}
            try {
              const statsResponse = await fetch(`${RAG_API_URL}/stats`, { signal: ragAbort.signal })
              if (statsResponse.ok) stats = await statsResponse.json()
            } catch {
              // Non-critical — fall back to default model
            }
            const configuredLlmModel = (stats.llm_model as string) || 'llama3.1:8b'

            // Call Python backend streaming API
            const pythonResponse = await fetch(`${RAG_API_URL}/query/stream`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: ragAbort.signal,
              body: JSON.stringify({
                query,
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

            reader = pythonResponse.body?.getReader()
            if (!reader) {
              throw new Error('No response body from Python backend')
            }

            const decoder = new TextDecoder()
            let buffer = ""

            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })

              const lines = buffer.split("\n")
              buffer = lines.pop() || ""

              for (const line of lines) {
                if (!line.trim()) continue

                if (line.startsWith("data: ")) {
                  const data = line.slice(6).trim()
                  if (!data || data === "[DONE]") continue

                  try {
                    const json = JSON.parse(data)

                    if (json.type === "sources") {
                      ragSources = json.sources || []
                      continue
                    }

                    if (json.type === "status") {
                      continue
                    }

                    if (json.token) {
                      fullAnswer += json.token
                      controller.enqueue(encoder.encode(`0:${JSON.stringify(json.token)}\n`))
                    } else if (json.content) {
                      fullAnswer += json.content
                      controller.enqueue(encoder.encode(`0:${JSON.stringify(json.content)}\n`))
                    }
                  } catch {
                    // Not JSON — treat as raw text
                    if (data.trim()) {
                      fullAnswer += data
                      controller.enqueue(encoder.encode(`0:${JSON.stringify(data)}\n`))
                    }
                  }
                } else if (line.trim()) {
                  fullAnswer += line
                  controller.enqueue(encoder.encode(`0:${JSON.stringify(line)}\n`))
                }
              }
            }

            if (ragSources.length > 0) {
              const sourcesData = JSON.stringify([{ type: 'rag_sources', sources: ragSources }])
              controller.enqueue(encoder.encode(`2:${sourcesData}\n`))
            }

            controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`))
            controller.close()

            await storeAssistantMessage({
              validation,
              chatId,
              messages: [{ role: 'assistant', content: fullAnswer }] as any,
              message_group_id,
              model,
            })
          } catch (error) {
            // Cancel the upstream reader so the Python backend stops streaming
            reader?.cancel().catch(() => {})
            console.error('[RAG] Error in stream:', error)
            const errorMsg = error instanceof Error ? error.message : String(error)
            controller.enqueue(encoder.encode(`3:${JSON.stringify(errorMsg)}\n`))
            controller.close()
          } finally {
            clearTimeout(ragTimeout)
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

    // Only enable web search when the toggle is on AND the API key is configured
    const shouldEnableWebSearch =
      (enableSearch || aiSettings?.enableWebSearch || false) &&
      !!process.env.TAVILY_API_KEY

    let effectiveSystemPrompt = systemPrompt || SYSTEM_PROMPT_DEFAULT

    // Enhance system prompt when web search is enabled
    if (shouldEnableWebSearch) {
      const now = new Date()
      const currentDate = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      effectiveSystemPrompt = `Today's date is ${currentDate}.

${effectiveSystemPrompt}

You have access to a web search tool. Use it when the question requires up-to-date information, recent events, or when you are not confident in your answer. You do not need to search for every question — use your judgment.

When you do use web search:
1. Use a clear, specific query
2. Analyze the results carefully
3. Synthesize information from multiple sources when possible
4. Cite sources by mentioning the website names or URLs`
    }

    // Messages are already cleaned at the top of the function
    let enhancedMessages = messages

    // Ollama doesn't require API keys
    const apiKey: string | undefined = undefined

    // Build tools object
    const mcpTools = await getMCPTools()
    const tools: ToolSet = {
      ...(shouldEnableWebSearch ? { ...webSearchTools, ...pageReaderTools } : {}),
      ...mcpTools,
    }

    const hasTools = Object.keys(tools).length > 0
    const result = streamText({
      model: modelConfig.apiSdk(apiKey, { enableSearch: shouldEnableWebSearch }),
      system: effectiveSystemPrompt,
      messages: enhancedMessages as MessageAISDK[],
      ...(hasTools ? { tools, maxSteps: 10 } : {}),
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
