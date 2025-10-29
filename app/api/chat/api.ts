import type {
  ChatApiParams,
  LogUserMessageParams,
  StoreAssistantMessageParams,
  DatabaseClientType,
} from "@/app/types/api.types"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import { sanitizeUserInput } from "@/lib/sanitize"
import { validateUserIdentity } from "@/lib/server/api"

// SQLite functionality removed - this is now a no-op
async function saveFinalAssistantMessageToSQLite(
  chatId: string,
  messages: any[],
  message_group_id?: string,
  model?: string
): Promise<void> {
  // Database functionality removed
  return
}

export async function validateAndTrackUsage({
  userId,
  model,
  isAuthenticated,
}: ChatApiParams): Promise<DatabaseClientType | null> {
  const dbClient = await validateUserIdentity(userId, isAuthenticated)

  // Only Ollama models are supported - all are allowed
  const provider = getProviderForModel(model)
  
  if (provider !== "ollama") {
    throw new Error("Only Ollama models are supported in this local-only setup.")
  }

  // In SQLite mode, no usage tracking needed
  return dbClient
}

export async function incrementMessageCount({
  supabase,
  userId,
}: {
  supabase: DatabaseClientType
  userId: string
}): Promise<void> {
  // SQLite mode - no usage tracking needed
  return
}

export async function logUserMessage({
  supabase,
  userId,
  chatId,
  content,
  attachments,
  model,
  isAuthenticated,
  message_group_id,
}: LogUserMessageParams): Promise<void> {
  try {
    const messageId = crypto.randomUUID()
    const message = {
      id: messageId,
      chat_id: chatId,
      role: "user",
      content: sanitizeUserInput(content),
      experimental_attachments: attachments ? JSON.stringify(attachments) : null,
      created_at: new Date().toISOString(),
      message_group_id: message_group_id || null,
      model: model || null,
    }

    // Database functionality removed
    return
  } catch (error) {
    console.error("User message save failed:", error)
    throw error
  }
}

export async function storeAssistantMessage({
  supabase,
  chatId,
  messages,
  message_group_id,
  model,
}: StoreAssistantMessageParams): Promise<void> {
  console.log(`[Store Debug] Storing ${messages.length} messages for chat ${chatId}`)
  const assistantMessages = messages.filter(m => m.role === 'assistant')
  console.log(`[Store Debug] Found ${assistantMessages.length} assistant messages`)
  assistantMessages.forEach((msg, i) => {
    console.log(`[Store Debug] Assistant message ${i}: experimental_attachments = ${(msg as any).experimental_attachments?.length || 0}`)
  })

  // SQLite-only mode
  try {
    await saveFinalAssistantMessageToSQLite(chatId, messages, message_group_id, model)
    console.log('[SQLite] Assistant messages saved successfully')
  } catch (error) {
    console.error("SQLite assistant message save failed:", error)
    throw error
  }
}
