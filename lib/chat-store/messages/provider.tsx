"use client"

import { toast } from "@/components/ui/toast"
import { useChatSession } from "@/lib/chat-store/session/provider"
// Cache functionality removed
import type { Message as MessageAISDK } from "ai"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { writeToIndexedDB } from "../persist"
import {
  addMessage,
  cacheMessages,
  clearMessagesForChat,
  getCachedMessages,
  getMessagesFromDb,
  setMessages as saveMessages,
} from "./api"

interface MessagesContextType {
  messages: MessageAISDK[]
  isLoading: boolean
  setMessages: React.Dispatch<React.SetStateAction<MessageAISDK[]>>
  refresh: () => Promise<void>
  saveAllMessages: (messages: MessageAISDK[]) => Promise<void>
  cacheAndAddMessage: (message: MessageAISDK) => Promise<void>
  resetMessages: () => Promise<void>
  deleteMessages: () => Promise<void>
}

const MessagesContext = createContext<MessagesContextType | null>(null)

export function useMessages() {
  const context = useContext(MessagesContext)
  if (!context)
    throw new Error("useMessages must be used within MessagesProvider")
  return context
}

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<MessageAISDK[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { chatId } = useChatSession()
  const currentChatIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Reset on chatId change
    if (chatId === null) {
      setMessages([])
      setIsLoading(false)
      currentChatIdRef.current = null
      return
    }

    if (!chatId) return

    // Always load when chatId changes
    const load = async () => {
      // Store the chatId we're loading for
      const loadingChatId = chatId
      currentChatIdRef.current = loadingChatId

      setIsLoading(true)

      try {
        // Clear messages immediately to prevent duplicates when switching chats
        setMessages([])

        // Fetch directly from DB (skip cache to avoid duplicates)
        const fresh = await getMessagesFromDb(loadingChatId)

        // Only update state if we're still on the same chat
        // This prevents race conditions when switching chats quickly
        if (currentChatIdRef.current === loadingChatId) {
          setMessages(fresh)
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error)
        // Only update loading state if we're still on the same chat
        if (currentChatIdRef.current === loadingChatId) {
          setIsLoading(false)
        }
      }
    }

    load()
  }, [chatId])

  const refresh = async () => {
    if (!chatId) return

    try {
      const fresh = await getMessagesFromDb(chatId)
      setMessages(fresh)
    } catch {
      toast({ title: "Failed to refresh messages", status: "error" })
    }
  }

  const cacheAndAddMessage = async (message: MessageAISDK) => {
    if (!chatId) return

    try {
      await addMessage(chatId, message)

      setMessages((prev) => {
        const updated = [...prev, message]
        writeToIndexedDB("messages", { id: chatId, messages: updated })

        // Update memory cache
        // Cache removed
        return updated
      })
    } catch (error) {
      console.error("Failed to save message:", error)
      toast({ title: "Failed to save message", status: "error" })
    }
  }

  const saveAllMessages = async (newMessages: MessageAISDK[]) => {
    // Handle the case where chatId is null (e.g., first time user opens chat before it's created)
    if (!chatId) {
      console.warn(
        "[MessagesProvider] Cannot save messages: chatId is null. " +
        "This usually means a chat hasn't been created yet. " +
        "Messages will be saved once a chat is created."
      )
      // Store messages in state temporarily so they're not lost
      setMessages(newMessages)
      return
    }

    try {
      await saveMessages(chatId, newMessages)
      setMessages(newMessages)
    } catch (error) {
      console.error("[MessagesProvider] Failed to save messages:", error)
      toast({ title: "Failed to save messages", status: "error" })
    }
  }

  const deleteMessages = async () => {
    if (!chatId) return

    setMessages([])
    await clearMessagesForChat(chatId)
  }

  const resetMessages = async () => {
    setMessages([])
  }

  return (
    <MessagesContext.Provider
      value={{
        messages,
        isLoading,
        setMessages,
        refresh,
        saveAllMessages,
        cacheAndAddMessage,
        resetMessages,
        deleteMessages,
      }}
    >
      {children}
    </MessagesContext.Provider>
  )
}
