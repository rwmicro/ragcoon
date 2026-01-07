import type { Message as MessageAISDK } from "ai"
import { readFromIndexedDB, writeToIndexedDB } from "../persist"

export async function getMessagesFromDb(
  chatId: string,
  options?: { limit?: number; offset?: number }
): Promise<MessageAISDK[]> {
  try {
    // Fetch from SQLite database
    const response = await fetch('/api/sqlite/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get',
        chatId,
        limit: options?.limit,
        offset: options?.offset
      })
    })

    if (!response.ok) {
      console.error('Failed to fetch messages from database')
      return await getCachedMessages(chatId)
    }

    const { data } = await response.json()
    const messages = data || []

    // Messages from DB already have parts removed (done in SQLite API)
    // They only contain experimental_attachments for RAG sources

    // Cache the fetched messages (only if no pagination, to keep full cache)
    if (messages.length > 0 && !options?.limit && !options?.offset) {
      await cacheMessages(chatId, messages)
    }

    return messages
  } catch (error) {
    console.error('Error fetching messages:', error)
    return await getCachedMessages(chatId)
  }
}

/**
 * Count total messages for a chat
 */
export async function countMessages(chatId: string): Promise<number> {
  try {
    const response = await fetch('/api/sqlite/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'count', chatId })
    })

    if (!response.ok) {
      console.error('Failed to count messages from database')
      return 0
    }

    const { data } = await response.json()
    return data?.count || 0
  } catch (error) {
    console.error('Error counting messages:', error)
    return 0
  }
}

async function insertMessageToDb(chatId: string, message: MessageAISDK) {
  try {
    await fetch('/api/sqlite/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', chatId, data: message })
    })
  } catch (error) {
    console.error('Failed to insert message to database:', error)
  }
}

async function insertMessagesToDb(chatId: string, messages: MessageAISDK[]) {
  try {
    await fetch('/api/sqlite/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createMany', chatId, data: messages })
    })
  } catch (error) {
    console.error('Failed to insert messages to database:', error)
  }
}

async function deleteMessagesFromDb(chatId: string) {
  try {
    await fetch('/api/sqlite/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteAll', chatId })
    })
  } catch (error) {
    console.error('Failed to delete messages from database:', error)
  }
}

type ChatMessageEntry = {
  id: string
  messages: MessageAISDK[]
}

export async function getCachedMessages(
  chatId: string
): Promise<MessageAISDK[]> {
  const entry = await readFromIndexedDB<ChatMessageEntry>("messages", chatId)

  if (!entry || Array.isArray(entry)) return []

  return (entry.messages || []).sort(
    (a, b) => +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0)
  )
}

export async function cacheMessages(
  chatId: string,
  messages: MessageAISDK[]
): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages })
}

export async function addMessage(
  chatId: string,
  message: MessageAISDK
): Promise<void> {
  // Remove parts field before storing to avoid AI SDK validation issues
  const { parts, ...messageWithoutParts } = message as any
  const cleanMessage = messageWithoutParts as MessageAISDK

  await insertMessageToDb(chatId, cleanMessage)
  const current = await getCachedMessages(chatId)
  const updated = [...current, cleanMessage]

  await writeToIndexedDB("messages", { id: chatId, messages: updated })
}

export async function setMessages(
  chatId: string,
  messages: MessageAISDK[]
): Promise<void> {
  // Remove parts field from all messages before storing
  const cleanMessages = messages.map((msg) => {
    const { parts, ...messageWithoutParts } = msg as any
    return messageWithoutParts as MessageAISDK
  })

  await insertMessagesToDb(chatId, cleanMessages)
  await writeToIndexedDB("messages", { id: chatId, messages: cleanMessages })
}

export async function clearMessagesCache(chatId: string): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages: [] })
}

export async function clearMessagesForChat(chatId: string): Promise<void> {
  await deleteMessagesFromDb(chatId)
  await clearMessagesCache(chatId)
}
