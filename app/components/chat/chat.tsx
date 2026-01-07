"use client"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { Conversation } from "@/app/components/chat/conversation"
import { useModel } from "@/app/components/chat/use-model"
import { useChatDraft } from "@/app/hooks/use-chat-draft"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { useChatSession } from "@/lib/chat-store/session/provider"
import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { useModel as useModelStore } from "@/lib/model-store/provider"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { useUser } from "@/lib/user-store/provider"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState, useEffect } from "react"
import { FileUpload, FileUploadContent } from "@/components/prompt-kit/file-upload"
import { FileArrowUp } from "@phosphor-icons/react"
import { useChatCore } from "./use-chat-core"
import { useChatOperations } from "./use-chat-operations"
import { useFileUpload } from "./use-file-upload"
import Image from "next/image"
import { useTheme } from "next-themes"
import { QueryMode, QUERY_MODES } from "@/app/components/chat-input/query-mode-selector"

// Only lazy load non-critical components
const FeedbackWidget = dynamic(
  () => import("./feedback-widget").then((mod) => mod.FeedbackWidget),
  { ssr: false }
)


export function Chat() {
  const router = useRouter()
  const { chatId } = useChatSession()
  const { theme } = useTheme()
  const {
    createNewChat,
    getChatById,
    updateChatModel,
    bumpChat,
    isLoading: isChatsLoading,
  } = useChats()

  const currentChat = useMemo(
    () => (chatId ? getChatById(chatId) : null),
    [chatId, getChatById]
  )

  const { messages: initialMessages, cacheAndAddMessage, refresh: refreshMessages, isLoading: isMessagesLoading } = useMessages()
  const { user } = useUser()
  const { preferences } = useUserPreferences()
  const { draftValue, clearDraft } = useChatDraft(chatId)
  const { models } = useModelStore()

  // File upload functionality
  const {
    files,
    setFiles,
    handleFileUploads,
    createOptimisticAttachments,
    cleanupOptimisticAttachments,
    handleFileUpload,
    handleFileRemove,
  } = useFileUpload()

  // Model selection
  const { selectedModel, handleModelChange } = useModel({
    currentChat: currentChat || null,
    user,
    updateChatModel,
    chatId,
  })

  // Query mode state (must be before systemPrompt)
  const [queryMode, setQueryMode] = useState<QueryMode>("qa")

  // State to pass between hooks
  const isAuthenticated = true
  const systemPrompt = useMemo(() => {
    const basePrompt = user?.system_prompt || SYSTEM_PROMPT_DEFAULT
    const modePrompt = QUERY_MODES.find(m => m.value === queryMode)?.systemPrompt || ""
    return `${basePrompt}\n\n${modePrompt}`
  }, [user?.system_prompt, queryMode])

  // New state for quoted text
  const [quotedText, setQuotedText] = useState<{
    text: string
    messageId: string
  }>()
  const handleQuotedSelected = useCallback(
    (text: string, messageId: string) => {
      setQuotedText({ text, messageId })
    },
    []
  )

  // Chat operations (utils + handlers) - created first
  const { ensureChatExists, handleDelete, handleEdit } =
    useChatOperations({
      isAuthenticated,
      chatId,
      messages: initialMessages,
      selectedModel,
      systemPrompt,
      createNewChat,
      setMessages: () => { },
      setInput: () => { },
    })

  // Core chat functionality (initialization + state + actions)
  const {
    messages,
    input,
    status,
    stop,
    hasSentFirstMessageRef,
    isSubmitting,
    enableSearch,
    setEnableSearch,
    submit,
    handleReload,
    handleInputChange,
    streamData,
  } = useChatCore({
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
  })

  // Memoize the conversation props to prevent unnecessary rerenders
  // Reduce dependencies - only re-create when messages array or status actually changes
  const conversationProps = useMemo(
    () => ({
      messages,
      status,
      onDelete: handleDelete,
      onEdit: handleEdit,
      onReload: handleReload,
      onQuote: handleQuotedSelected,
      currentModel: selectedModel,
      chatId,
      streamData,
    }),
    [
      messages,
      messages.length, // Track length changes separately
      status,
      handleDelete,
      handleEdit,
      handleReload,
      handleQuotedSelected,
      selectedModel,
      chatId,
      streamData,
    ]
  )

  // Get the last assistant message for voice conversation
  const lastAssistantMessage = useMemo(() => {
    const assistantMessages = messages.filter((m) => m.role === "assistant")
    return assistantMessages.length > 0
      ? assistantMessages[assistantMessages.length - 1].content
      : undefined
  }, [messages])

  // Memoize the chat input props
  // Optimize dependencies - avoid unnecessary re-creation
  const chatInputProps = useMemo(
    () => ({
      value: input,
      onValueChange: (val: string) => {
        handleInputChange(val)
      },
      onSend: () => {
        submit()
      },
      isSubmitting,
      files,
      onFileUpload: handleFileUpload,
      onFileRemove: handleFileRemove,
      onSelectModel: handleModelChange,
      selectedModel,
      isUserAuthenticated: true,
      stop,
      status,
      setEnableSearch,
      enableSearch,
      quotedText,
      lastAssistantMessage,
      queryMode,
      onQueryModeChange: setQueryMode,
    }),
    [
      input,
      handleInputChange,
      submit,
      isSubmitting,
      files,
      files.length, // Track file count separately
      handleFileUpload,
      lastAssistantMessage,
      handleFileRemove,
      chatId,
      messages.length,
      handleModelChange,
      selectedModel,
      stop,
      status,
      setEnableSearch,
      enableSearch,
      quotedText,
      queryMode,
    ]
  )

  // Handle redirect for invalid chatId
  useEffect(() => {
    // If a message has been sent in this session, never redirect
    // This handles race conditions during chat creation
    if (hasSentFirstMessageRef.current) {
      return
    }

    // Wait for both chats and messages to finish loading before redirecting
    if (
      chatId &&
      !isChatsLoading &&
      !isMessagesLoading &&
      !currentChat &&
      !isSubmitting &&
      status === "ready" &&
      messages.length === 0
    ) {
      console.log('[Chat] Invalid chatId detected, redirecting to home:', chatId)
      // Add a small delay to ensure the chat really doesn't exist
      // This prevents false positives during rapid navigation
      const timeoutId = setTimeout(() => {
        // Double-check conditions before redirecting
        if (!currentChat && messages.length === 0) {
          router.push("/")
        }
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [chatId, currentChat, isChatsLoading, isMessagesLoading, isSubmitting, status, messages.length, hasSentFirstMessageRef, router])

  const showOnboarding = !chatId && messages.length === 0 && status === "ready"

  // Check if current model supports vision/file uploads
  const currentModel = models.find((m) => m.id === selectedModel)
  const modelSupportsFiles = currentModel?.vision

  return (
    <FileUpload
      onFilesAdded={handleFileUpload}
      multiple
      accept="image/jpeg,image/png,image/gif,image/webp,image/svg,image/heic,image/heif,video/mp4,video/webm,video/quicktime,.avi,.wmv,.3gp,.flv,.mkv,.txt,.md"
      disabled={!modelSupportsFiles}
    >
      <div
        className={cn(
          "@container/main relative flex h-[calc(100dvh-var(--spacing-app-header))] flex-col items-center justify-end overflow-hidden md:justify-center"
        )}
      >
        <FileUploadContent>
          <div className="border-input bg-background/95 flex flex-col items-center rounded-2xl border border-dashed p-12 shadow-lg backdrop-blur-sm">
            <FileArrowUp className="text-primary size-12 mb-4" />
            <span className="mb-2 text-xl font-semibold">Drop files here</span>
            <span className="text-muted-foreground text-center text-sm max-w-sm">
              Drop images, videos, or documents anywhere to upload and analyze with your selected multimodal model
            </span>
            {!modelSupportsFiles && (
              <span className="text-amber-600 dark:text-amber-400 mt-3 text-sm font-medium">
                Select a vision-capable model to upload files
              </span>
            )}
          </div>
        </FileUploadContent>

        <AnimatePresence initial={false} mode="popLayout">
          {showOnboarding ? (
            <motion.div
              key="onboarding"
              className="absolute bottom-[60%] mx-auto max-w-[50rem] md:relative md:bottom-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              layout="position"
              layoutId="onboarding"
              transition={{
                layout: {
                  duration: 0,
                },
              }}
            >
              <Image
                src={"/logo.jpg"}
                alt="Racoon Logo"
                width={100}
                height={100}
                className="mb-3 mx-auto rounded-md"
              />
              <h1 className="mb-6 text-3xl font-medium tracking-tight">
                What&apos;s on your mind?
              </h1>
            </motion.div>
          ) : (
            <Conversation key="conversation" {...conversationProps} />
          )}
        </AnimatePresence>

        <motion.div
          className={cn(
            "relative inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl"
          )}
          layout="position"
          layoutId="chat-input-container"
          transition={{
            layout: {
              duration: messages.length === 1 ? 0.3 : 0,
            },
          }}
        >
          <ChatInput {...chatInputProps} />
        </motion.div>

        <FeedbackWidget authUserId={user?.id} />
      </div>
    </FileUpload>
  )
}
