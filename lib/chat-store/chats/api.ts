import { readFromIndexedDB, writeToIndexedDB } from "@/lib/chat-store/persist"
import type { Chat, Chats } from "@/lib/chat-store/types"
import { MODEL_DEFAULT } from "../../config"
import { fetchClient } from "../../fetch"
import { API_ROUTE_UPDATE_CHAT_MODEL } from "../../routes"

export async function getChatsForUserInDb(userId: string): Promise<Chats[]> {
  try {
    const response = await fetch('/api/sqlite/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', userId })
    })
    
    if (!response.ok) throw new Error('Failed to fetch chats')
    
    const { data } = await response.json()
    return data || []
  } catch (error) {
    console.error("Failed to fetch chats:", error)
    return []
  }
}

export async function updateChatTitleInDb(id: string, title: string) {
  try {
    const response = await fetch('/api/sqlite/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, data: { title } })
    })
    
    if (!response.ok) throw new Error('Failed to update chat title')
  } catch (error) {
    console.error("Failed to update chat title:", error)
    throw error
  }
}

export async function deleteChatInDb(id: string) {
  try {
    const response = await fetch('/api/sqlite/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    })
    
    if (!response.ok) throw new Error('Failed to delete chat')
  } catch (error) {
    console.error("Failed to delete chat:", error)
    throw error
  }
}

export async function getAllUserChatsInDb(userId: string): Promise<Chats[]> {
  try {
    const response = await fetch('/api/sqlite/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', userId })
    })
    
    if (!response.ok) throw new Error('Failed to fetch chats')
    
    const { data } = await response.json()
    return data || []
  } catch (error) {
    console.error("Failed to get all user chats:", error)
    return []
  }
}

export async function createChatInDb(
  userId: string,
  title: string,
  model: string,
  systemPrompt: string
): Promise<string | null> {
  try {
    const chat = {
      user_id: userId,
      title,
      model,
      system_prompt: systemPrompt,
      created_at: new Date().toISOString(),
    }
    
    const response = await fetch('/api/sqlite/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', data: chat })
    })
    
    if (!response.ok) throw new Error('Failed to create chat')
    
    const { data } = await response.json()
    return data?.id || null
  } catch (error) {
    console.error("Failed to create chat:", error)
    return null
  }
}

export async function fetchAndCacheChats(userId: string): Promise<Chats[]> {
  try {
    const response = await fetch('/api/sqlite/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', userId })
    })
    
    if (!response.ok) throw new Error('Failed to fetch chats')
    
    const { data } = await response.json()
    
    // Always cache and return SQLite data, even if empty
    await writeToIndexedDB("chats", data || [])
    return data || []
  } catch (error) {
    console.warn("SQLite chats fetch failed, falling back to cache:", error)
    // Fallback to IndexedDB cache only
    return await getCachedChats()
  }
}

export async function getCachedChats(): Promise<Chats[]> {
  const all = await readFromIndexedDB<Chats>("chats")
  console.log('[getCachedChats] Raw IndexedDB data:', all)
  const sorted = (all as Chats[]).sort(
    (a, b) => +new Date(b.created_at || "") - +new Date(a.created_at || "")
  )
  console.log('[getCachedChats] Sorted chats:', sorted.length, 'chats')
  return sorted
}

export async function updateChatTitle(
  id: string,
  title: string
): Promise<void> {
  await updateChatTitleInDb(id, title)
  const all = await getCachedChats()
  const updated = (all as Chats[]).map((c) =>
    c.id === id ? { ...c, title } : c
  )
  await writeToIndexedDB("chats", updated)
}

export async function deleteChat(id: string): Promise<void> {
  await deleteChatInDb(id)
  const all = await getCachedChats()
  await writeToIndexedDB(
    "chats",
    (all as Chats[]).filter((c) => c.id !== id)
  )
}

export async function getChat(chatId: string): Promise<Chat | null> {
  const all = await readFromIndexedDB<Chat>("chats")
  return (all as Chat[]).find((c) => c.id === chatId) || null
}

export async function getUserChats(userId: string): Promise<Chat[]> {
  const data = await getAllUserChatsInDb(userId)
  if (!data) return []
  await writeToIndexedDB("chats", data)
  return data
}

export async function createChat(
  userId: string,
  title: string,
  model: string,
  systemPrompt: string
): Promise<string> {
  const id = await createChatInDb(userId, title, model, systemPrompt)
  const finalId = id ?? crypto.randomUUID()

  await writeToIndexedDB("chats", {
    id: finalId,
    title,
    model,
    user_id: userId,
    system_prompt: systemPrompt,
    created_at: new Date().toISOString(),
  })

  return finalId
}

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

    const all = await getCachedChats()
    const updated = (all as Chats[]).map((c) =>
      c.id === chatId ? { ...c, model } : c
    )
    await writeToIndexedDB("chats", updated)

    return responseData
  } catch (error) {
    console.error("Error updating chat model:", error)
    throw error
  }
}

export async function createNewChat(
  userId: string,
  title?: string,
  model?: string,
  isAuthenticated?: boolean,
  projectId?: string
): Promise<Chats> {
  try {
    const payload: {
      userId: string
      title: string
      model: string
      isAuthenticated?: boolean
      projectId?: string
    } = {
      userId,
      title: title || "New Chat",
      model: model || MODEL_DEFAULT,
      isAuthenticated,
    }

    if (projectId) {
      payload.projectId = projectId
    }

    const res = await fetchClient("/api/create-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const responseData = await res.json()
    console.log('[createNewChatFromDb] API response:', responseData)

    if (!res.ok || !responseData.chat) {
      console.error('[createNewChatFromDb] API error:', responseData)
      throw new Error(responseData.error || "Failed to create chat")
    }

    const chat: Chats = {
      id: responseData.chat.id,
      title: responseData.chat.title,
      created_at: responseData.chat.created_at,
      model: responseData.chat.model,
      user_id: responseData.chat.user_id,
      public: responseData.chat.public,
      updated_at: responseData.chat.updated_at,
      project_id: responseData.chat.project_id || null,
    }

    console.log('[createNewChatFromDb] Formatted chat:', chat)
    await writeToIndexedDB("chats", chat)
    console.log('[createNewChatFromDb] Saved to IndexedDB')
    return chat
  } catch (error) {
    console.error("Error creating new chat:", error)
    throw error
  }
}
