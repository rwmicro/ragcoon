import { validateUserIdentity } from "@/lib/server/api"
import { checkUsageByModel } from "@/lib/usage"

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
  // Database functionality removed - return chat object only
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

  // Database saving removed - chat is only stored in IndexedDB on client-side
  return chat
}
