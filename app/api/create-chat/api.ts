import { validateUserIdentity } from "@/lib/server/api"
import { getDb } from '@/lib/db'

type CreateChatInput = {
  userId: string
  title?: string
  model: string
  isAuthenticated: boolean
  projectId?: string
}

export async function createChatInDb({
  userId,
  title,
  model,
  isAuthenticated,
  projectId,
}: CreateChatInput) {
  const chatId = crypto.randomUUID()
  const now = new Date().toISOString()

  const chat = {
    id: chatId,
    user_id: userId,
    title: title || "New Chat",
    model,
    created_at: now,
    updated_at: now,
    project_id: projectId || null,
    public: false,
    system_prompt: null,
  }

  try {
    // Save to SQLite database
    const db = await getDb()
    try {
      await db.run(
        `INSERT INTO chats (id, user_id, title, model, system_prompt, created_at, updated_at, project_id, public)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          chatId,
          userId,
          chat.title,
          model,
          chat.system_prompt,
          now,
          now,
          projectId || null,
          chat.public ? 1 : 0
        ]
      )
    } finally {
      await db.close()
    }
  } catch (error) {
    console.error('Failed to save chat to database:', error)
    // Continue even if database save fails - chat will be stored in IndexedDB
  }

  return chat
}
