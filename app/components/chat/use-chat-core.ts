import { useChatDraft } from "@/app/hooks/use-chat-draft"
import { toast } from "@/components/ui/toast"
import { getOrCreateGuestUserId } from "@/lib/api"
// Cache functionality removed
import { MESSAGE_MAX_LENGTH, SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { Attachment } from "@/lib/file-handling"
import { API_ROUTE_CHAT } from "@/lib/routes"
import type { UserProfile } from "@/lib/user/types"
import type { Message } from "@ai-sdk/react"
import { useChat } from "@ai-sdk/react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { activeBlobUrls } from "./use-file-upload"

type UseChatCoreProps = {
  initialMessages: Message[]
  draftValue: string
  cacheAndAddMessage: (message: Message) => void
  chatId: string | null
  user: UserProfile | null
  files: File[]
  createOptimisticAttachments: (
    files: File[]
  ) => Array<{ name: string; contentType: string; url: string }>
  setFiles: (files: File[]) => void
  cleanupOptimisticAttachments: (attachments?: Array<{ url?: string }>) => void
  ensureChatExists: (uid: string, input: string) => Promise<string | null>
  handleFileUploads: (
    uid: string,
    chatId: string
  ) => Promise<Attachment[] | null>
  selectedModel: string
  clearDraft: () => void
  bumpChat: (chatId: string) => void
}

export function useChatCore({
  initialMessages,
  draftValue,
  cacheAndAddMessage,
  chatId,
  user,
  files,
  createOptimisticAttachments,
  setFiles,
  cleanupOptimisticAttachments,
  ensureChatExists,
  handleFileUploads,
  selectedModel,
  clearDraft,
  bumpChat,
}: UseChatCoreProps) {
  // State management
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)

  // Refs and derived state
  const hasSentFirstMessageRef = useRef(false)
  const prevChatIdRef = useRef<string | null>(chatId)
const isAuthenticated = true
  const systemPrompt = useMemo(
    () => user?.system_prompt || SYSTEM_PROMPT_DEFAULT,
    [user?.system_prompt]
  )

  // Search params handling
  const searchParams = useSearchParams()
  const prompt = searchParams.get("prompt")

  // Handle errors directly in onError callback
  const handleError = useCallback((error: Error) => {
    console.error("Chat error:", error)
    console.error("Error message:", error.message)
    let errorMsg = error.message || "Something went wrong."

    if (errorMsg === "An error occurred" || errorMsg === "fetch failed") {
      errorMsg = "Something went wrong. Please try again."
    }

    toast({
      title: errorMsg,
      status: "error",
    })
  }, [])

  // Initialize useChat with static body - we'll override it in individual calls
  const {
    messages,
    input,
    handleSubmit,
    status,
    error,
    reload,
    stop,
    setMessages,
    setInput,
    append,
  } = useChat({
    api: API_ROUTE_CHAT,
    initialMessages,
    initialInput: draftValue,
    onFinish: cacheAndAddMessage,
    onError: handleError,
  })

  // Handle search params on mount
  useEffect(() => {
    if (prompt && typeof window !== "undefined") {
      requestAnimationFrame(() => setInput(prompt))
    }
  }, [prompt, setInput])

  // Reset messages when navigating from a chat to home with memory cleanup
  const prevMessagesLengthRef = useRef(0)

  useEffect(() => {
    if (
      prevChatIdRef.current !== null &&
      chatId === null &&
      messages.length > 0
    ) {
      // Clear messages and force cleanup
      setMessages([])

      // Clear cache for previous chat if it was large
      if (prevChatIdRef.current && prevMessagesLengthRef.current > 50) {
        // Cache functionality removed
      }

      // Force garbage collection hint
      if (global.gc) global.gc()
    }

    // Reset hasSentFirstMessageRef when switching chats
    if (prevChatIdRef.current !== chatId) {
      hasSentFirstMessageRef.current = false
    }

    prevChatIdRef.current = chatId
    prevMessagesLengthRef.current = messages.length
  }, [chatId, messages.length, setMessages])

  // Submit action with memory optimization
  const submit = useCallback(async () => {
    setIsSubmitting(true)
    hasSentFirstMessageRef.current = true

    const uid = await getOrCreateGuestUserId(user)
    if (!uid) {
      setIsSubmitting(false)
      return
    }

    const optimisticId = `optimistic-${Date.now().toString()}`
    
    // Optimize attachments creation to avoid duplication
    const optimisticAttachments = files.length > 0 ? createOptimisticAttachments(files) : null

    const optimisticMessage = {
      id: optimisticId,
      content: input,
      role: "user" as const,
      createdAt: new Date(),
      experimental_attachments: optimisticAttachments || undefined,
    }

    // Use functional update to avoid closure issues
    setMessages((prev) => {
      const newMessages = [...prev, optimisticMessage]

      // Limit message history in memory to prevent bloat (reduced from 100 to 50)
      const MAX_MESSAGES_IN_MEMORY = 50
      if (newMessages.length > MAX_MESSAGES_IN_MEMORY) {
        // Clean up attachments from messages being removed
        const removedMessages = newMessages.slice(0, newMessages.length - MAX_MESSAGES_IN_MEMORY)
        removedMessages.forEach(msg => {
          if (msg.experimental_attachments) {
            cleanupOptimisticAttachments(msg.experimental_attachments as any)
          }
        })

        return newMessages.slice(-MAX_MESSAGES_IN_MEMORY)
      }
      return newMessages
    })
    
    setInput("")

    // Clear files immediately and copy reference
    const submittedFiles = files.slice() // Shallow copy
    setFiles([])

    try {
      const currentChatId = await ensureChatExists(uid, input)
      if (!currentChatId) {
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
        cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
        return
      }

      if (input.length > MESSAGE_MAX_LENGTH) {
        toast({
          title: `The message you submitted was too long, please submit something shorter. (Max ${MESSAGE_MAX_LENGTH} characters)`,
          status: "error",
        })
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
        cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
        return
      }

      let attachments: Attachment[] | null = []
      if (submittedFiles.length > 0) {
        attachments = await handleFileUploads(uid, currentChatId)
        if (attachments === null) {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
          cleanupOptimisticAttachments(
            optimisticMessage.experimental_attachments
          )
          return
        }
      }

      const options = {
        body: {
          chatId: currentChatId,
          userId: uid,
          model: selectedModel,
          isAuthenticated,
          systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
          enableSearch,
        },
        experimental_attachments: attachments || undefined,
      }

      handleSubmit(undefined, options)
      // Remove optimistic message efficiently
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      
      // Cleanup attachments and cache the real message
      if (optimisticMessage.experimental_attachments) {
        cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
      }
      
      // Cache the message and clear draft
      cacheAndAddMessage(optimisticMessage)
      clearDraft()

      // Always bump chat to ensure it appears in sidebar
      bumpChat(currentChatId)
    } catch (error) {
      console.error('Submit error:', error)
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      
      if (optimisticMessage.experimental_attachments) {
        cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
      }
      
      toast({ title: "Failed to send message", status: "error" })
    } finally {
      setIsSubmitting(false)
      
      // Force garbage collection hint
      if (global.gc) global.gc()
    }
  }, [
    user,
    files,
    createOptimisticAttachments,
    input,
    setMessages,
    setInput,
    setFiles,
    cleanupOptimisticAttachments,
    ensureChatExists,
    handleFileUploads,
    selectedModel,
    isAuthenticated,
    systemPrompt,
    enableSearch,
    handleSubmit,
    cacheAndAddMessage,
    clearDraft,
    messages.length,
    bumpChat,
    setIsSubmitting,
  ])

  // Handle suggestion
  const handleSuggestion = useCallback(
    async (suggestion: string) => {
      setIsSubmitting(true)
      hasSentFirstMessageRef.current = true
      const optimisticId = `optimistic-${Date.now().toString()}`
      const optimisticMessage = {
        id: optimisticId,
        content: suggestion,
        role: "user" as const,
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, optimisticMessage])

      try {
        const uid = await getOrCreateGuestUserId(user)

        if (!uid) {
          setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
          return
        }

        const currentChatId = await ensureChatExists(uid, suggestion)

        if (!currentChatId) {
          setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
          return
        }

        const options = {
          body: {
            chatId: currentChatId,
            userId: uid,
            model: selectedModel,
            isAuthenticated,
            systemPrompt: SYSTEM_PROMPT_DEFAULT,
          },
        }

        append(
          {
            role: "user",
            content: suggestion,
          },
          options
        )
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      } catch {
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
        toast({ title: "Failed to send suggestion", status: "error" })
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      ensureChatExists,
      selectedModel,
      user,
      append,
      isAuthenticated,
      setMessages,
      setIsSubmitting,
    ]
  )

  // Handle reload - call reload with proper body parameters
  const handleReload = useCallback(async () => {
    console.log('[DEBUG] handleReload called')
    console.log('[DEBUG] Current status:', status)
    console.log('[DEBUG] Messages length:', messages.length)
    console.log('[DEBUG] ChatId:', chatId)
    
    if (messages.length === 0) {
      console.log('[DEBUG] No messages to reload')
      return
    }

    // Find the last assistant message
    const lastMessage = messages[messages.length - 1]
    console.log('[DEBUG] Last message:', { role: lastMessage.role, id: lastMessage.id, content: lastMessage.content?.substring(0, 100) })
    
    if (lastMessage.role !== 'assistant') {
      console.log('[DEBUG] Last message is not from assistant, cannot reload')
      return
    }

    console.log('[DEBUG] About to call reload() function')
    console.log('[DEBUG] Reload function type:', typeof reload)
    
    try {
      const uid = await getOrCreateGuestUserId(user)
      if (!uid) {
        console.error('[DEBUG] Could not get user ID')
        return
      }
      
      console.log('[DEBUG] Got user ID:', uid)
      
      const options = {
        body: {
          chatId,
          userId: uid,
          model: selectedModel,
          isAuthenticated,
          systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
        },
      }
      
      console.log('[DEBUG] Calling reload with options:', options)
      const result = reload(options)
      console.log('[DEBUG] Reload function returned:', result)
    } catch (error) {
      console.error('[DEBUG] Error during reload:', error)
      handleError(error as Error)
    }
  }, [messages, reload, handleError, status, chatId, user, selectedModel, isAuthenticated, systemPrompt])

  // Handle input change - now with access to the real setInput function!
  const { setDraftValue } = useChatDraft(chatId)
  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value)
      setDraftValue(value)
    },
    [setInput, setDraftValue]
  )

  return {
    // Chat state
    messages,
    input,
    handleSubmit,
    status,
    error,
    reload: handleReload, // Use wrapped reload function
    stop,
    setMessages,
    setInput,
    append,
    isAuthenticated,
    systemPrompt,
    hasSentFirstMessageRef,

    // Component state
    isSubmitting,
    setIsSubmitting,
    enableSearch,
    setEnableSearch,

    // Actions
    submit,
    handleSuggestion,
    handleReload,
    handleInputChange,
  }
}
