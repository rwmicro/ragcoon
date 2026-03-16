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
  const db = await getDb()
  const stmt = await db.prepare(
    `INSERT OR REPLACE INTO messages (id, chat_id, content, role, user_id, model, parts, experimental_attachments, created_at, message_group_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  try {
    for (const msg of messages) {
      let content = ''
      if (typeof msg.content === 'string') {
        content = msg.content
      } else if (Array.isArray(msg.content)) {
        content = msg.content
          .map((part: any) => typeof part === 'string' ? part : part.text || '')
          .join('')
      } else if (msg.content && typeof msg.content === 'object') {
        content = msg.content.text || JSON.stringify(msg.content)
      }

      await stmt.run(
        msg.id || nanoid(),
        chatId,
        content,
        msg.role,
        'local-user',
        model || null,
        msg.parts ? JSON.stringify(msg.parts) : null,
        msg.experimental_attachments ? JSON.stringify(msg.experimental_attachments) : null,
        new Date().toISOString(),
        message_group_id || null
      )
    }
  } finally {
    await stmt.finalize()
  }
}

export async function validateAndTrackUsage({
  userId,
  model,
  isAuthenticated,
}: ChatApiParams): Promise<DatabaseClientType | null> {
  const dbClient = await validateUserIdentity(userId)

  if (model.startsWith('rag:') || model.startsWith('rag-')) {
    return dbClient
  }

  const provider = getProviderForModel(model)
  if (provider !== "ollama") {
    throw new Error("Only Ollama models are supported in this local-only setup.")
  }

  return dbClient
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
  const db = await getDb()
  await db.run(
    `INSERT INTO messages (id, chat_id, content, role, user_id, model, experimental_attachments, created_at, message_group_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nanoid(),
      chatId,
      sanitizeUserInput(content),
      'user',
      'local-user',
      model || null,
      attachments ? JSON.stringify(attachments) : null,
      new Date().toISOString(),
      message_group_id || null,
    ]
  )
}

export async function storeAssistantMessage({
  validation,
  chatId,
  messages,
  message_group_id,
  model,
}: StoreAssistantMessageParams): Promise<void> {
  const allowedMessages = messages.filter(m =>
    m.role === 'assistant' || m.role === 'user' || m.role === 'system'
  )

  try {
    await saveFinalAssistantMessageToSQLite(chatId, allowedMessages, message_group_id, model)
  } catch (error) {
    console.error("SQLite assistant message save failed:", error)
    throw error
  }
}
