import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { getAllModels } from "@/lib/models"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
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
      messages,
      chatId,
      userId,
      model,
      isAuthenticated,
      systemPrompt,
      enableSearch,
      message_group_id,
    } = (await req.json()) as ChatRequest

    if (!messages || !chatId || !userId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    const supabase = await validateAndTrackUsage({
      userId,
      model,
      isAuthenticated,
    })

    // Increment message count for successful validation
    if (supabase) {
      await incrementMessageCount({ supabase, userId })
    }

    const userMessage = messages[messages.length - 1]

    // Always log user message (function handles both Supabase and SQLite)
    if (userMessage?.role === "user") {
      await logUserMessage({
        supabase,
        userId,
        chatId,
        content: userMessage.content,
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

    if (!modelConfig.apiSdk) {
      console.error(`Model ${model} has no apiSdk configured`)
      throw new Error(`Model ${model} configuration error`)
    }

    let effectiveSystemPrompt = systemPrompt || SYSTEM_PROMPT_DEFAULT
    let enhancedMessages = messages

    // Ollama doesn't require API keys
    const apiKey: string | undefined = undefined

    const result = streamText({
      model: modelConfig.apiSdk(apiKey, { enableSearch }),
      system: effectiveSystemPrompt,
      messages: enhancedMessages,
      tools: {} as ToolSet,
      maxSteps: 10,
      onError: (err: unknown) => {
        console.error("Streaming error occurred:", err)
        // Don't set streamError anymore - let the AI SDK handle it through the stream
      },

      onFinish: async ({ response }) => {
        // Always store assistant message
        await storeAssistantMessage({
          supabase,
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
