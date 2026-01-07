import type {
  ChatApiParams,
  LogUserMessageParams,
  StoreAssistantMessageParams,
  DatabaseClientType,
} from "@/app/types/api.types"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import { sanitizeUserInput } from "@/lib/sanitize"
import { validateUserIdentity } from "@/lib/server/api"
import { getDb } from '@/lib/db'
import { nanoid } from 'nanoid'

async function saveFinalAssistantMessageToSQLite(
  chatId: string,
  messages: any[],
  message_group_id?: string,
  model?: string
): Promise<void> {
  try {
    const db = await getDb()
    const stmt = await db.prepare(
      `INSERT OR REPLACE INTO messages (id, chat_id, content, role, user_id, model, parts, experimental_attachments, created_at, message_group_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    for (const msg of messages) {
      // Extract content - it might be an array of parts or a string
      let content = ''
      if (typeof msg.content === 'string') {
        content = msg.content
      } else if (Array.isArray(msg.content)) {
        // If content is an array of parts, extract text from each part
        content = msg.content
          .map((part: any) => typeof part === 'string' ? part : part.text || '')
          .join('')
      } else if (msg.content && typeof msg.content === 'object') {
        // If it's an object with text property
        content = msg.content.text || JSON.stringify(msg.content)
      }

      const messageId = msg.id || nanoid()

      await stmt.run(
        messageId,
        chatId,
        content,
        msg.role,
        'local-user', // Fixed user_id for single user mode
        model || null,
        msg.parts ? JSON.stringify(msg.parts) : null,
        msg.experimental_attachments ? JSON.stringify(msg.experimental_attachments) : null,
        new Date().toISOString(),
        message_group_id || null
      )
    }

    await stmt.finalize()
    await db.close()
  } catch (error) {
    console.error('Failed to save assistant messages to SQLite:', error)
    throw error
  }
}

export async function validateAndTrackUsage({
  userId,
  model,
  isAuthenticated,
}: ChatApiParams): Promise<DatabaseClientType | null> {
  const dbClient = await validateUserIdentity(userId)

  // Skip provider validation for RAG models
  if (model.startsWith('rag:') || model.startsWith('rag-')) {
    // RAG models use Ollama internally, no need for provider validation
    return dbClient
  }

  // Only Ollama models are supported - all are allowed
  const provider = getProviderForModel(model)

  if (provider !== "ollama") {
    throw new Error("Only Ollama models are supported in this local-only setup.")
  }

  // In SQLite mode, no usage tracking needed
  return dbClient
}

export async function incrementMessageCount({
  validation,
  userId,
}: {
  validation: DatabaseClientType
  userId: string
}): Promise<void> {
  // SQLite mode - no usage tracking needed
  return
}

export async function logUserMessage({
  validation,
  userId,
  chatId,
  content,
  attachments,
  model,
  isAuthenticated,
  message_group_id,
}: LogUserMessageParams): Promise<void> {
  try {
    const db = await getDb()
    // Generate a unique ID for the user message
    const messageId = nanoid()

    await db.run(
      `INSERT INTO messages (id, chat_id, content, role, user_id, model, experimental_attachments, created_at, message_group_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        chatId,
        sanitizeUserInput(content),
        'user',
        'local-user', // Fixed user_id for single user mode
        model || null,
        attachments ? JSON.stringify(attachments) : null,
        new Date().toISOString(),
        message_group_id || null
      ]
    )
    await db.close()
  } catch (error) {
    console.error("User message save failed:", error)
    throw error
  }
}

export async function storeAssistantMessage({
  validation,
  chatId,
  messages,
  message_group_id,
  model,
}: StoreAssistantMessageParams): Promise<void> {
  console.log(`[Store Debug] Storing ${messages.length} messages for chat ${chatId}`)

  // Filter to only allowed roles: 'user', 'assistant', 'system'
  // Remove 'tool' messages that are created during tool calls
  const allowedMessages = messages.filter(m =>
    m.role === 'assistant' || m.role === 'user' || m.role === 'system'
  )

  console.log(`[Store Debug] Filtered to ${allowedMessages.length} allowed messages (removed ${messages.length - allowedMessages.length} tool messages)`)

  const assistantMessages = allowedMessages.filter(m => m.role === 'assistant')
  console.log(`[Store Debug] Found ${assistantMessages.length} assistant messages`)
  assistantMessages.forEach((msg, i) => {
    console.log(`[Store Debug] Assistant message ${i}: experimental_attachments = ${(msg as any).experimental_attachments?.length || 0}`)
  })

  // SQLite-only mode
  try {
    await saveFinalAssistantMessageToSQLite(chatId, allowedMessages, message_group_id, model)
    console.log('[SQLite] Assistant messages saved successfully')
  } catch (error) {
    console.error("SQLite assistant message save failed:", error)
    throw error
  }
}
