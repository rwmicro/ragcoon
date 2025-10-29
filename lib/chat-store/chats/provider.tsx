"use client"

import { toast } from "@/components/ui/toast"
import { getOrCreateGuestUserId } from "@/lib/api"
import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { MODEL_DEFAULT, SYSTEM_PROMPT_DEFAULT } from "../../config"
import type { Chats } from "../types"
import {
  createNewChat as createNewChatFromDb,
  deleteChat as deleteChatFromDb,
  fetchAndCacheChats,
  getCachedChats,
  updateChatModel as updateChatModelFromDb,
  updateChatTitle,
} from "./api"

interface ChatsContextType {
  chats: Chats[]
  refresh: () => Promise<void>
  isLoading: boolean
  updateTitle: (id: string, title: string) => Promise<void>
  deleteChat: (
    id: string,
    currentChatId?: string,
    redirect?: () => void
  ) => Promise<void>
  setChats: React.Dispatch<React.SetStateAction<Chats[]>>
  createNewChat: (
    userId: string,
    title?: string,
    model?: string,
    isAuthenticated?: boolean,
    systemPrompt?: string,
    projectId?: string
  ) => Promise<Chats | undefined>
  resetChats: () => Promise<void>
  getChatById: (id: string) => Chats | undefined
  updateChatModel: (id: string, model: string) => Promise<void>
  bumpChat: (id: string) => Promise<void>
}
const ChatsContext = createContext<ChatsContextType | null>(null)

export function useChats() {
  const context = useContext(ChatsContext)
  if (!context) throw new Error("useChats must be used within ChatsProvider")
  return context
}

export function ChatsProvider({
  userId,
  children,
}: {
  userId?: string
  children: React.ReactNode
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [chats, setChats] = useState<Chats[]>([])
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null)
  const refreshInProgressRef = useRef(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const setupUserId = async () => {
      let finalUserId = userId

      if (!finalUserId) {
        // Generate guest user ID if none provided
        const guestId = await getOrCreateGuestUserId(null)
        if (guestId) {
          finalUserId = guestId
        } else {
          // Fallback if guest creation fails
          finalUserId = `fallback_${Date.now()}`
        }
      }

      if (finalUserId) {
        setEffectiveUserId(finalUserId)
      }
    }

    setupUserId()
  }, [userId])

  useEffect(() => {
    if (!effectiveUserId) return

    const load = async () => {
      setIsLoading(true)

      // Load cached chats first for instant display
      const cached = await getCachedChats()
      setChats(cached)
      setIsLoading(false) // Show cached data immediately

      // Fetch fresh data in background using startTransition
      startTransition(() => {
        fetchAndCacheChats(effectiveUserId).then(fresh => {
          setChats(fresh)
        }).catch(error => {
          console.error('[ChatsProvider] Failed to fetch fresh chats:', error)
        })
      })
    }

    load()
  }, [effectiveUserId])

  const refresh = async () => {
    if (!effectiveUserId || refreshInProgressRef.current) return

    try {
      refreshInProgressRef.current = true
      const fresh = await fetchAndCacheChats(effectiveUserId)
      setChats(fresh)
    } finally {
      refreshInProgressRef.current = false
    }
  }

  const refreshAndReturn = async () => {
    if (!effectiveUserId || refreshInProgressRef.current) return []

    try {
      refreshInProgressRef.current = true
      const fresh = await fetchAndCacheChats(effectiveUserId)
      setChats(fresh)
      return fresh
    } finally {
      refreshInProgressRef.current = false
    }
  }

  const updateTitle = async (id: string, title: string) => {
    const prev = [...chats]
    const updatedChatWithNewTitle = prev.map((c) =>
      c.id === id ? { ...c, title, updated_at: new Date().toISOString() } : c
    )
    const sorted = updatedChatWithNewTitle.sort(
      (a, b) => +new Date(b.updated_at || "") - +new Date(a.updated_at || "")
    )
    setChats(sorted)
    try {
      await updateChatTitle(id, title)
    } catch {
      setChats(prev)
      toast({ title: "Failed to update title", status: "error" })
    }
  }

  const deleteChat = async (
    id: string,
    currentChatId?: string,
    redirect?: () => void
  ) => {
    const prev = [...chats]
    setChats((prev) => prev.filter((c) => c.id !== id))

    try {
      await deleteChatFromDb(id)
      if (id === currentChatId && redirect) redirect()
    } catch {
      setChats(prev)
      toast({ title: "Failed to delete chat", status: "error" })
    }
  }

  const createNewChat = async (
    userId: string,
    title?: string,
    model?: string,
    isAuthenticated?: boolean,
    systemPrompt?: string,
    projectId?: string
  ) => {
    // Use the provided userId or fall back to effectiveUserId
    const finalUserId = userId || effectiveUserId
    if (!finalUserId) return
    const prev = [...chats]

    const optimisticId = `optimistic-${Date.now().toString()}`
    const optimisticChat = {
      id: optimisticId,
      title: title || "New Chat",
      created_at: new Date().toISOString(),
      model: model || MODEL_DEFAULT,
      system_prompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
      user_id: finalUserId,
      public: true,
      updated_at: new Date().toISOString(),
      project_id: null,
    }
    setChats((prev) => [optimisticChat, ...prev])

    try {
      const newChat = await createNewChatFromDb(
        finalUserId,
        title,
        model,
        isAuthenticated,
        projectId
      )

      console.log('[createNewChat] Created chat:', newChat)
      console.log('[createNewChat] Optimistic ID to replace:', optimisticId)

      setChats((prev) => {
        const updated = [
          newChat,
          ...prev.filter((c) => c.id !== optimisticId),
        ]
        console.log('[createNewChat] Updated chats state:', updated.length, 'chats')
        return updated
      })

      return newChat
    } catch (error) {
      console.error('[createNewChat] Error creating chat:', error)
      setChats(prev)
      toast({ title: "Failed to create chat", status: "error" })
    }
  }

  const resetChats = async () => {
    setChats([])
  }

  const getChatById = (id: string) => {
    const chat = chats.find((c) => c.id === id)
    return chat
  }

  const updateChatModel = async (id: string, model: string) => {
    const prev = [...chats]
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, model } : c)))
    try {
      await updateChatModelFromDb(id, model)
    } catch {
      setChats(prev)
      toast({ title: "Failed to update model", status: "error" })
    }
  }

  const bumpChat = async (id: string) => {
    console.log('[bumpChat] Called for ID:', id)
    console.log('[bumpChat] Current chats:', chats.length, 'chats')
    console.log('[bumpChat] Current chat IDs:', chats.map(c => c.id))
    
    const prev = [...chats]
    const chatExists = prev.find(c => c.id === id)
    console.log('[bumpChat] Chat exists in state:', !!chatExists)
    
    if (!chatExists) {
      console.warn('[bumpChat] Chat not found in state, refreshing chats list')
      const refreshedChats = await refreshAndReturn()
      
      // After refresh, try to find the chat again
      const chatExistsAfterRefresh = refreshedChats.find(c => c.id === id)
      
      if (chatExistsAfterRefresh) {
        console.log('[bumpChat] Chat found after refresh, proceeding with bump')
        const updatedChats = refreshedChats.map((c) =>
          c.id === id ? { ...c, updated_at: new Date().toISOString() } : c
        )
        const sorted = updatedChats.sort(
          (a, b) => +new Date(b.updated_at || "") - +new Date(a.updated_at || "")
        )
        setChats(sorted)
      } else {
        console.warn('[bumpChat] Chat still not found after refresh')
      }
      return
    }
    
    const updatedChatWithNewUpdatedAt = prev.map((c) =>
      c.id === id ? { ...c, updated_at: new Date().toISOString() } : c
    )
    const sorted = updatedChatWithNewUpdatedAt.sort(
      (a, b) => +new Date(b.updated_at || "") - +new Date(a.updated_at || "")
    )
    console.log('[bumpChat] Sorted chats:', sorted.length, 'chats')
    setChats(sorted)
  }

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    chats,
    refresh,
    updateTitle,
    deleteChat,
    setChats,
    createNewChat,
    resetChats,
    getChatById,
    updateChatModel,
    bumpChat,
    isLoading,
  }), [chats, isLoading]) // Only recreate when chats or isLoading changes

  return (
    <ChatsContext.Provider value={contextValue}>
      {children}
    </ChatsContext.Provider>
  )
}
