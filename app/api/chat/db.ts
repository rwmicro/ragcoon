// This file is deprecated - using SQLite-only implementation in api.ts
// Keeping for potential future reference but functions are not used

import type { ContentPart, Message } from "@/app/types/api.types"
import type { Database, Json } from "@/app/types/database.types"

const DEFAULT_STEP = 0

// Deprecated function - SQLite implementation is in api.ts
export async function saveFinalAssistantMessage(
  _deprecated: any,
  chatId: string,
  messages: Message[],
  message_group_id?: string,
  model?: string
) {
  const parts: ContentPart[] = []
  const toolMap = new Map<string, ContentPart>()
  const textParts: string[] = []

  for (const msg of messages) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text") {
          textParts.push(part.text || "")
          parts.push(part)
        } else if (part.type === "tool-invocation" && part.toolInvocation) {
          const { toolCallId, state } = part.toolInvocation
          if (!toolCallId) continue

          const existing = toolMap.get(toolCallId)
          if (state === "result" || !existing) {
            toolMap.set(toolCallId, {
              ...part,
              toolInvocation: {
                ...part.toolInvocation,
                args: part.toolInvocation?.args || {},
              },
            })
          }
        } else if (part.type === "reasoning") {
          parts.push({
            type: "reasoning",
            reasoning: part.text || "",
            details: [
              {
                type: "text",
                text: part.text || "",
              },
            ],
          })
        } else if (part.type === "step-start") {
          parts.push(part)
        }
      }
    } else if (msg.role === "tool" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "tool-result") {
          const toolCallId = part.toolCallId || ""
          toolMap.set(toolCallId, {
            type: "tool-invocation",
            toolInvocation: {
              state: "result",
              step: DEFAULT_STEP,
              toolCallId,
              toolName: part.toolName || "",
              result: part.result,
            },
          })
        }
      }
    }
  }

  // Merge tool parts at the end
  parts.push(...toolMap.values())

  const finalPlainText = textParts.join("\n\n")

  // Get experimental_attachments from the last assistant message
  const lastAssistantMessage = messages.findLast(msg => msg.role === "assistant") as any
  const experimentalAttachments = lastAssistantMessage?.experimental_attachments || []
  
  console.log(`[DB Save DEBUG] Saving message with ${experimentalAttachments.length} experimental_attachments`)
  if (experimentalAttachments.length > 0) {
    console.log('[DB Save DEBUG] Attachments preview:', experimentalAttachments.map((att: any) => ({ name: att.name, contentType: att.contentType })))
  }

  // Function is deprecated - SQLite implementation is in api.ts
  throw new Error("This function is deprecated. Use SQLite implementation in api.ts")
}
