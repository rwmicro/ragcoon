import { useChatDraft } from "@/app/hooks/use-chat-draft"
import { toast } from "@/components/ui/toast"
import { getOrCreateGuestUserId, queryStream, RAGSource } from "@/lib/api"
// Cache functionality removed
import { useChatSession } from "@/lib/chat-store/session/provider"
import { useAISettings } from "@/lib/ai-settings-store/provider"
import { MESSAGE_MAX_LENGTH, SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { Attachment } from "@/lib/file-handling"
import { API_ROUTE_CHAT } from "@/lib/routes"
import type { UserProfile } from "@/lib/user/types"
import type { Message } from "@ai-sdk/react"
import { useChat } from "@ai-sdk/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { activeBlobUrls } from "./use-file-upload"
import { useRAG } from "@/hooks/useRAG"

type UseChatCoreProps = {
  initialMessages: Message[]
  draftValue: string
  cacheAndAddMessage: (message: Message) => void
  refreshMessages: () => Promise<void>
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
  refreshMessages,
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
  // Router for navigation
  const router = useRouter()

  // Get setChatId from session context
  const { setChatId } = useChatSession()

  // Get AI settings
  const { settings: aiSettings } = useAISettings()

  // Get RAG settings
  const { activeCollectionId, settings: ragSettings } = useRAG()

  // Merge AI settings with RAG settings for multilingual and advanced features
  const mergedRagSettings = {
    ...ragSettings,
    // Override with AI settings for advanced features
    use_graph_rag: aiSettings.enableGraphRAG,
    graph_expansion_depth: aiSettings.graphExpansionDepth,
    graph_alpha: aiSettings.graphAlpha,
    use_hyde: aiSettings.enableHyDE,
    hyde_fusion: aiSettings.hydeFusion,
    num_hypothetical_docs: aiSettings.numHypotheticalDocs,
    use_multi_query: aiSettings.enableMultiQuery,
    num_query_variations: aiSettings.numQueryVariations,
    // Multilingual settings from AI settings
    enable_multilingual: aiSettings.enableMultilingual,
    query_language: aiSettings.queryLanguage,
    use_multilingual_embeddings: aiSettings.useMultilingualEmbeddings,
    use_multilingual_bm25: aiSettings.useMultilingualBM25,
    use_multilingual_hyde: aiSettings.useMultilingualHyDE,
    use_multilingual_classifier: aiSettings.useMultilingualClassifier,
    detect_language: aiSettings.detectLanguage,
    // Advanced retrieval settings from AI settings
    enable_multi_hop: aiSettings.enableMultiHop,
    max_hops: aiSettings.maxHops,
    enable_contrastive: aiSettings.enableContrastive,
    enable_mmr: aiSettings.enableMMR,
    mmr_lambda: aiSettings.mmrLambda,
    enable_adaptive_alpha: aiSettings.enableAdaptiveAlpha,
  }

  // State management
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [enableSearch, setEnableSearchState] = useState(false)
  const [ragStatus, setRagStatus] = useState<"streaming" | "ready" | "submitted" | "error">("ready")

  // Persist enableSearch per chat in localStorage
  useEffect(() => {
    if (!chatId) return
    const stored = localStorage.getItem(`web-search:${chatId}`)
    setEnableSearchState(stored === 'true')
  }, [chatId])

  const setEnableSearch = useCallback((val: boolean) => {
    setEnableSearchState(val)
    if (chatId) localStorage.setItem(`web-search:${chatId}`, String(val))
  }, [chatId])

  // Refs and derived state
  const hasSentFirstMessageRef = useRef(false)
  const prevChatIdRef = useRef<string | null>(chatId)
  const lastSubmitTimeRef = useRef<number>(0)
  const isSubmittingRef = useRef(false) // Prevent concurrent submissions
  const ragAbortControllerRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<Message[]>([])

  // Stable ID for useChat hook - prevents re-initialization when chatId changes during new chat creation
  const stableUseChatId = useRef(chatId || `temp-${Date.now()}`)

  // Update stable ID when chatId changes, but only when NOT submitting
  // This prevents the hook from reinitializing mid-submission
  useEffect(() => {
    if (chatId && !isSubmitting) {
      stableUseChatId.current = chatId
    }
  }, [chatId, isSubmitting])
  const isAuthenticated = true
  const systemPrompt = useMemo(
    () => user?.system_prompt || SYSTEM_PROMPT_DEFAULT,
    [user?.system_prompt]
  )

  // Store original attachments in a Map for UI display
  // This allows us to keep attachments out of useChat (to avoid tool_result errors)
  // but still display them in the UI
  // Limit to 100 messages to prevent memory leaks
  const MAX_ATTACHMENTS_MAP_SIZE = 100
  const attachmentsMapRef = useRef<Map<string, any>>(new Map())

  // Helper to add attachment while maintaining size limit
  const addAttachmentToMap = useCallback((messageId: string, attachments: any) => {
    // If map is at capacity, remove oldest entry
    if (attachmentsMapRef.current.size >= MAX_ATTACHMENTS_MAP_SIZE) {
      const firstKey = attachmentsMapRef.current.keys().next().value
      if (firstKey) {
        attachmentsMapRef.current.delete(firstKey)
      }
    }
    attachmentsMapRef.current.set(messageId, attachments)
  }, [])

  // Update attachments map when initialMessages change
  useEffect(() => {
    initialMessages.forEach(msg => {
      if ((msg as any).experimental_attachments) {
        addAttachmentToMap(msg.id, (msg as any).experimental_attachments)
      }
    })
  }, [initialMessages, addAttachmentToMap])

  // Clean initialMessages BEFORE passing to useChat
  // Remove experimental_attachments to prevent AI SDK from converting them to tool_result parts
  const cleanedInitialMessages = useMemo(() => {
    return initialMessages.map(msg => {
      const { experimental_attachments, ...msgWithoutAttachments } = msg as any
      return msgWithoutAttachments
    })
  }, [initialMessages])

  // Search params handling
  const searchParams = useSearchParams()
  const prompt = searchParams.get("prompt")

  // Handle errors directly in onError callback
  const handleError = useCallback((error: Error) => {
    console.error("[useChat handleError] Chat error:", error)
    console.error("[useChat handleError] Error message:", error.message)
    console.error("[useChat handleError] Error stack:", error.stack)
    let errorMsg = error.message || "Something went wrong."

    if (errorMsg === "An error occurred" || errorMsg === "fetch failed") {
      errorMsg = "Something went wrong. Please try again."
    }

    // CRITICAL: Reset submitting state on error to unblock the UI
    // This ensures that even if handleFinish is never called, the user can try again
    isSubmittingRef.current = false
    setIsSubmitting(false)
    setRagStatus("error")

    toast({
      title: errorMsg,
      status: "error",
    })
  }, [])

  // Handle finish callback
  const handleFinish = useCallback(async (message: Message) => {
    // Store attachments in our map before they're stripped from useChat state
    if ((message as any).experimental_attachments) {
      addAttachmentToMap(message.id, (message as any).experimental_attachments)
    }

    // For RAG models, the message is already stored by the API during streaming
    // So we skip cacheAndAddMessage to avoid duplicates
    const isRAGModel = selectedModel.startsWith('rag:') || !!activeCollectionId

    if (!isRAGModel) {
      await cacheAndAddMessage(message)
    }

    await refreshMessages()

    isSubmittingRef.current = false
    setIsSubmitting(false)
    setRagStatus("ready")
  }, [cacheAndAddMessage, refreshMessages, selectedModel, addAttachmentToMap, activeCollectionId])

  // Initialize useChat with static body - we'll override it in individual calls
  // IMPORTANT: id is used to distinguish between different chat sessions
  // Use stable ID to prevent re-initialization when chatId changes during new chat creation
  const {
    messages,
    input,
    handleSubmit,
    status: chatStatus,
    error,
    reload,
    stop: chatStop,
    setMessages,
    setInput,
    append,
    data: streamData,
  } = useChat({
    id: stableUseChatId.current,
    api: API_ROUTE_CHAT,
    initialMessages: cleanedInitialMessages,
    initialInput: draftValue,
    experimental_throttle: 50,
    onFinish: handleFinish,
    onError: handleError,
    onResponse: (response) => {
      if (!response.ok) {
        console.error('[useChat onResponse] Response not OK:', response.statusText)
      }
    },
  })

  // Update messagesRef whenever messages change
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Combined status
  const status = ragStatus !== "ready" ? ragStatus : chatStatus

  // Custom stop function that handles both RAG and regular chat
  const stop = useCallback(() => {
    if (ragAbortControllerRef.current) {
      ragAbortControllerRef.current.abort()
      ragAbortControllerRef.current = null
      setRagStatus("ready")
      setIsSubmitting(false)
      isSubmittingRef.current = false
    }
    chatStop()
  }, [chatStop])

  // Handle search params on mount
  useEffect(() => {
    if (prompt && typeof window !== "undefined") {
      requestAnimationFrame(() => setInput(prompt))
    }
  }, [prompt, setInput])

  // Sync messages from initialMessages when they change
  useEffect(() => {
    // CRITICAL: Don't sync during streaming/submission - it will wipe out the assistant's response!
    if (status === 'streaming' || status === 'submitted' || isSubmitting) {
      return
    }

    // CRITICAL: Don't sync when we have MORE messages than provider
    // This means we have unsaved streaming messages that are about to be saved by onFinish
    if (messages.length > initialMessages.length) {
      return
    }

    // Only update if initialMessages has MORE content than current messages
    if (initialMessages.length > messages.length) {
      // Double-check attachments are in the map (defensive)
      initialMessages.forEach(msg => {
        if ((msg as any).experimental_attachments && !attachmentsMapRef.current.has(msg.id)) {
          console.warn('[useChat Sync] Attachment missing from map, storing now:', msg.id)
          addAttachmentToMap(msg.id, (msg as any).experimental_attachments)
        }
      })

      setMessages(cleanedInitialMessages)
    }
  }, [initialMessages.length, messages.length, cleanedInitialMessages, setMessages, initialMessages, status, isSubmitting, addAttachmentToMap])

  // Reset messages when switching chats with memory cleanup
  const prevMessagesLengthRef = useRef(0)

  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      if (prevChatIdRef.current !== null) {
        hasSentFirstMessageRef.current = false
        attachmentsMapRef.current.clear()

        // When going to home page (chatId becomes null), clear messages and stop streaming
        if (chatId === null) {
          if (status === 'streaming' || status === 'submitted') {
            stop()
          }
          setMessages([])
          setIsSubmitting(false)
        }
      }
    }

    prevChatIdRef.current = chatId
    prevMessagesLengthRef.current = messages.length
  }, [chatId, messages.length, status, setMessages, stop])

  // Special effect: If we're on home page with no chatId and provider has no messages, clear local messages
  // BUT: Don't clear if we just submitted (give it 2 seconds to create the chat)
  useEffect(() => {
    const timeSinceLastSubmit = Date.now() - lastSubmitTimeRef.current
    const isRecentSubmit = timeSinceLastSubmit < 2000 // 2 seconds grace period

    // Only clear if NOT in RAG mode - RAG mode handles its own state
    if (chatId === null && initialMessages.length === 0 && messages.length > 0 && !isSubmitting && !isRecentSubmit && !activeCollectionId) {
      if (status === 'streaming' || status === 'submitted') {
        stop()
      }
      setMessages([])
      setIsSubmitting(false)
    }
  }, [chatId, initialMessages.length, messages.length, setMessages, stop, status, isSubmitting, activeCollectionId])

  // Cleanup attachments map on unmount
  useEffect(() => {
    return () => {
      attachmentsMapRef.current.clear()
    }
  }, [])

  // Submit action with memory optimization
  const submit = useCallback(async () => {
    // Prevent concurrent submissions (race condition protection)
    if (isSubmittingRef.current) {
      return
    }

    // Debounce: Prevent submissions within 500ms of each other
    const now = Date.now()
    const timeSinceLastSubmit = now - lastSubmitTimeRef.current
    if (timeSinceLastSubmit < 500 && lastSubmitTimeRef.current > 0) {
      return
    }
    lastSubmitTimeRef.current = now

    isSubmittingRef.current = true
    setIsSubmitting(true)
    hasSentFirstMessageRef.current = true

    const uid = await getOrCreateGuestUserId(user)
    if (!uid) {
      isSubmittingRef.current = false
      setIsSubmitting(false)
      return
    }

    // Track if this is a new chat creation (we're on home page)
    const isNewChat = !chatId

    // Store the chatId to use for this submission
    let activeChatId = chatId

    // For new chats, create chat and update URL + context
    if (isNewChat) {
      const currentChatId = await ensureChatExists(uid, input)
      if (!currentChatId) {
        isSubmittingRef.current = false
        setIsSubmitting(false)
        return
      }


      // Use the newly created chatId
      activeChatId = currentChatId

      // Update stable ID immediately so useChat uses the correct ID
      stableUseChatId.current = currentChatId

      // Update chatId in context FIRST
      setChatId(currentChatId)

      // Navigate immediately to the new chat using replaceState to avoid full page reload
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `/c/${currentChatId}`)
      }

      // Bump chat to ensure it appears in sidebar
      bumpChat(currentChatId)

      // Continue to send message immediately (no return)
    }

    // For both new and existing chats, continue with normal flow
    // Save message content before clearing
    const messageContent = input

    // Clear input immediately for better UX
    setInput("")
    clearDraft()

    // Copy files reference before clearing
    const submittedFiles = files.slice() // Shallow copy
    setFiles([])

    try {
      if (messageContent.length > MESSAGE_MAX_LENGTH) {
        toast({
          title: `The message you submitted was too long, please submit something shorter. (Max ${MESSAGE_MAX_LENGTH} characters)`,
          status: "error",
        })
        isSubmittingRef.current = false
        setIsSubmitting(false)
        return
      }

      let attachments: Attachment[] | null = []
      if (submittedFiles.length > 0) {
        attachments = await handleFileUploads(uid, activeChatId!)
        if (attachments === null) {
          isSubmittingRef.current = false
          setIsSubmitting(false)
          return
        }
      }

      // --- RAG LOGIC ---
      if (activeCollectionId) {
        setRagStatus("submitted")

        // 1. Add User Message
        const userMsgId = `user-${Date.now()}`
        const userMsg: Message = {
          id: userMsgId,
          role: "user",
          content: messageContent,
          createdAt: new Date(),
          experimental_attachments: attachments || undefined
        }

        // 2. Add Assistant Placeholder
        const assistantMsgId = `assistant-${Date.now()}`
        const assistantMsg: Message = {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          createdAt: new Date(),
        }

        // Update local messages state
        setMessages(prev => [...prev, userMsg, assistantMsg])

        // 3. Start Streaming
        setRagStatus("streaming")
        ragAbortControllerRef.current = new AbortController()

        let accumulatedContent = ""
        let accumulatedSources: RAGSource[] = []

        // Throttle state updates to rAF cadence (~60fps) instead of per-token
        let rafId: number | null = null
        let firstChunkReceived = false
        const flushContentToState = () => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, content: accumulatedContent }
              : m
          ))
          rafId = null
        }

        await queryStream(
          {
            query: messageContent,
            collection_id: activeCollectionId,
            conversation_history: messagesRef.current.map(m => ({ role: m.role, content: m.content })),
            ...mergedRagSettings
          },
          // onChunk — first token updates immediately (hides loader), rest use rAF
          (text) => {
            accumulatedContent += text
            if (!firstChunkReceived) {
              firstChunkReceived = true
              flushContentToState()
            } else if (!rafId) {
              rafId = requestAnimationFrame(flushContentToState)
            }
          },
          // onSources
          (sources) => {
            if (rafId) {
              cancelAnimationFrame(rafId)
              rafId = null
            }
            accumulatedSources = sources
            const sourcesBase64 = btoa(JSON.stringify(sources))
            const marker = `\n\n<!-- RAG_SOURCES:${sourcesBase64} -->`
            setMessages(prev => prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: accumulatedContent + marker }
                : m
            ))
          },
          // onError
          (err) => {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null }
            console.error('[RAG] Stream error:', err)
            handleError(err)
          },
          ragAbortControllerRef.current.signal
        )

        // Flush any remaining buffered content before finishing
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; flushContentToState() }

        // 4. Finish
        const finalContent = accumulatedContent + (accumulatedSources.length > 0
          ? `\n\n<!-- RAG_SOURCES:${btoa(JSON.stringify(accumulatedSources))} -->`
          : "")

        const finalMessage: Message = {
          ...assistantMsg,
          content: finalContent
        }

        await handleFinish(finalMessage)
        return
      }
      // --- END RAG LOGIC ---

      const options = {
        body: {
          chatId: activeChatId!,
          userId: uid,
          model: selectedModel,
          isAuthenticated,
          systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
          enableSearch,
          aiSettings: {
            temperature: aiSettings.temperature,
            maxTokens: aiSettings.maxTokens,
            topP: aiSettings.topP,
            frequencyPenalty: aiSettings.frequencyPenalty,
            presencePenalty: aiSettings.presencePenalty,
            enableWebSearch: aiSettings.enableWebSearch,
          },
        },
        experimental_attachments: attachments || undefined,
      }

      append({
        role: "user",
        content: messageContent,
      }, options)

      // NOTE: We don't call cacheAndAddMessage here because:
      // 1. The user message is already saved by logUserMessage in the API route
      // 2. The AI SDK will add the user message to the messages array
      // 3. Calling it here would create a duplicate

      // Don't reset isSubmitting here - it will be reset by handleFinish when streaming completes
    } catch (error) {
      console.error('Submit error:', error)
      toast({ title: "Failed to send message", status: "error" })
      // Only reset isSubmitting on error - on success, handleFinish will reset it
      setIsSubmitting(false)
      setRagStatus("error")
    }
  }, [
    user,
    files,
    input,
    ensureChatExists,
    handleFileUploads,
    selectedModel,
    isAuthenticated,
    systemPrompt,
    enableSearch,
    append,
    clearDraft,
    bumpChat,
    chatId,
    setChatId,
    setInput,
    setFiles,
    status,
    activeCollectionId,
    ragSettings,
    messagesRef,
    handleFinish,
    handleError
  ])

  // Handle reload - call reload with proper body parameters
  const handleReload = useCallback(async () => {
    if (messages.length === 0) return

    // Find the last assistant message
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant') {
      toast({ title: "Nothing to regenerate — last message is not from the assistant.", status: "error" })
      return
    }

    try {
      const uid = await getOrCreateGuestUserId(user)
      if (!uid) return

      // --- RAG LOGIC FOR RELOAD ---
      if (activeCollectionId) {
        // Remove last assistant message
        setMessages(prev => prev.slice(0, -1))

        // Get the last user message
        const lastUserMsg = messages[messages.length - 2]
        if (!lastUserMsg || lastUserMsg.role !== 'user') return

        const query = lastUserMsg.content

        // Re-run RAG logic
        setRagStatus("submitted")
        setIsSubmitting(true)

        const assistantMsgId = `assistant-${Date.now()}`
        const assistantMsg: Message = {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          createdAt: new Date(),
        }

        setMessages(prev => [...prev, assistantMsg])
        setRagStatus("streaming")
        ragAbortControllerRef.current = new AbortController()

        let accumulatedContent = ""
        let accumulatedSources: RAGSource[] = []

        await queryStream(
          {
            query,
            collection_id: activeCollectionId,
            conversation_history: messages.slice(0, -2).map(m => ({ role: m.role, content: m.content })),
            ...mergedRagSettings
          },
          (text) => {
            accumulatedContent += text
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m))
          },
          (sources) => {
            accumulatedSources = sources
            const marker = `\n\n<!-- RAG_SOURCES:${btoa(JSON.stringify(sources))} -->`
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: accumulatedContent + marker } : m))
          },
          (err) => handleError(err),
          ragAbortControllerRef.current.signal
        )

        const finalContent = accumulatedContent + (accumulatedSources.length > 0
          ? `\n\n<!-- RAG_SOURCES:${btoa(JSON.stringify(accumulatedSources))} -->`
          : "")

        const finalMessage: Message = { ...assistantMsg, content: finalContent }
        await handleFinish(finalMessage)
        return
      }
      // --- END RAG LOGIC ---

      const options = {
        body: {
          chatId,
          userId: uid,
          model: selectedModel,
          isAuthenticated,
          systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
          enableSearch,
          aiSettings: {
            temperature: aiSettings.temperature,
            maxTokens: aiSettings.maxTokens,
            topP: aiSettings.topP,
            frequencyPenalty: aiSettings.frequencyPenalty,
            presencePenalty: aiSettings.presencePenalty,
            enableWebSearch: aiSettings.enableWebSearch,
          },
        },
      }

      reload(options)
    } catch (error) {
      handleError(error as Error)
    }
  }, [messages, reload, handleError, chatId, user, selectedModel, isAuthenticated, systemPrompt, aiSettings, activeCollectionId, ragSettings, handleFinish])

  // Handle input change - now with access to the real setInput function!
  const { setDraftValue } = useChatDraft(chatId)
  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value)
      setDraftValue(value)
    },
    [setInput, setDraftValue]
  )

  // Merge messages with their stored attachments for display
  const messagesWithAttachments = useMemo(() => {
    return messages.map(msg => {
      const attachments = attachmentsMapRef.current.get(msg.id)
      if (attachments) {
        return {
          ...msg,
          experimental_attachments: attachments
        }
      }
      return msg
    })
  }, [messages])

  return {
    // Chat state
    messages: messagesWithAttachments,
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
    streamData, // RAG sources and other custom data

    // Component state
    isSubmitting,
    setIsSubmitting,
    enableSearch,
    setEnableSearch,

    // Actions
    submit,
    handleReload,
    handleInputChange,
  }
}
