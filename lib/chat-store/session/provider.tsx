"use client"

import { usePathname } from "next/navigation"
import { createContext, useContext, useEffect, useState } from "react"

type ChatSessionContextType = {
  chatId: string | null
  setChatId: (chatId: string | null) => void
}

const ChatSessionContext = createContext<ChatSessionContextType>({
  chatId: null,
  setChatId: () => {},
})

export const useChatSession = () => useContext(ChatSessionContext)

export function ChatSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Extract chatId from pathname
  const urlChatId = pathname?.startsWith("/c/") ? pathname.split("/c/")[1] : null

  // Internal state for chatId - allows programmatic updates
  const [chatId, setChatIdInternal] = useState<string | null>(urlChatId)

  // Track if chatId was set programmatically (to prevent URL overriding it)
  const [isProgrammaticUpdate, setIsProgrammaticUpdate] = useState(false)

  // Wrapper for setChatId that marks updates as programmatic
  const setChatId = (newChatId: string | null) => {
    console.log('[ChatSession] Programmatic setChatId called with:', newChatId)
    setIsProgrammaticUpdate(true)
    setChatIdInternal(newChatId)
  }

  // Sync with URL changes (for router.push, back button, etc.)
  // BUT: Don't override programmatic updates immediately
  useEffect(() => {
    console.log('[ChatSession] Pathname changed:', pathname, 'Extracted chatId:', urlChatId)

    // If this is a programmatic update, allow the URL to be out of sync temporarily
    // The caller is responsible for updating the URL via history.replaceState
    if (isProgrammaticUpdate) {
      console.log('[ChatSession] Ignoring URL change - programmatic update in progress')
      setIsProgrammaticUpdate(false)
      return
    }

    if (urlChatId !== chatId) {
      console.log('[ChatSession] Updating chatId from', chatId, 'to', urlChatId)
      setChatIdInternal(urlChatId)
    }
  }, [urlChatId, pathname, chatId, isProgrammaticUpdate])

  return (
    <ChatSessionContext.Provider value={{ chatId, setChatId }}>
      {children}
    </ChatSessionContext.Provider>
  )
}
