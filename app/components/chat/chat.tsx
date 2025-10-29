"use client"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { Conversation } from "@/app/components/chat/conversation"
import { useModel } from "@/app/components/chat/use-model"
import { useChatDraft } from "@/app/hooks/use-chat-draft"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { useChatSession } from "@/lib/chat-store/session/provider"
import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { getModelInfo } from "@/lib/models"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { useUser } from "@/lib/user-store/provider"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"
import { redirect } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import { FileUpload, FileUploadContent } from "@/components/prompt-kit/file-upload"
import { FileArrowUp } from "@phosphor-icons/react"
import { useChatCore } from "./use-chat-core"
import { useChatOperations } from "./use-chat-operations"
import { useFileUpload } from "./use-file-upload"

const FeedbackWidget = dynamic(
  () => import("./feedback-widget").then((mod) => mod.FeedbackWidget),
  { ssr: false }
)


export function Chat() {
  const { chatId } = useChatSession()
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

  const { messages: initialMessages, cacheAndAddMessage } = useMessages()
  const { user } = useUser()
  const { preferences } = useUserPreferences()
  const { draftValue, clearDraft } = useChatDraft(chatId)

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

  // State to pass between hooks
const isAuthenticated = true
  const systemPrompt = useMemo(
    () => user?.system_prompt || SYSTEM_PROMPT_DEFAULT,
    [user?.system_prompt]
  )

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
      setMessages: () => {},
      setInput: () => {},
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
    handleSuggestion,
    handleReload,
    handleInputChange,
  } = useChatCore({
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
  })

  // Memoize the conversation props to prevent unnecessary rerenders
  const conversationProps = useMemo(
    () => ({
      messages,
      status,
      onDelete: handleDelete,
      onEdit: handleEdit,
      onReload: handleReload,
      onQuote: handleQuotedSelected,
      currentModel: selectedModel,
    }),
    [
      messages,
      status,
      handleDelete,
      handleEdit,
      handleReload,
      handleQuotedSelected,
      selectedModel,
    ]
  )

  // Memoize the chat input props
  const chatInputProps = useMemo(
    () => ({
      value: input,
      onSuggestion: handleSuggestion,
      onValueChange: handleInputChange,
      onSend: submit,
      isSubmitting,
      files,
      onFileUpload: handleFileUpload,
      onFileRemove: handleFileRemove,
      hasSuggestions:
        preferences.promptSuggestions && !chatId && messages.length === 0,
      onSelectModel: handleModelChange,
      selectedModel,
      isUserAuthenticated: true,
      stop,
      status,
      setEnableSearch,
      enableSearch,
      quotedText,
    }),
    [
      input,
      handleSuggestion,
      handleInputChange,
      submit,
      isSubmitting,
      files,
      handleFileUpload,
      handleFileRemove,
      preferences.promptSuggestions,
      chatId,
      messages.length,
      handleModelChange,
      selectedModel,
      isAuthenticated,
      stop,
      status,
      setEnableSearch,
      enableSearch,
      quotedText,
    ]
  )

  // Handle redirect for invalid chatId - only redirect if we're certain the chat doesn't exist
  // and we're not in a transient state during chat creation
  if (
    chatId &&
    !isChatsLoading &&
    !currentChat &&
    !isSubmitting &&
    status === "ready" &&
    messages.length === 0 &&
    !hasSentFirstMessageRef.current // Don't redirect if we've already sent a message in this session
  ) {
    return redirect("/")
  }

  const showOnboarding = !chatId && messages.length === 0
  
  // Check if current model supports vision/file uploads
  const modelSupportsFiles = getModelInfo(selectedModel)?.vision

  return (
    <FileUpload
      onFilesAdded={handleFileUpload}
      multiple
      accept="image/jpeg,image/png,image/gif,image/webp,image/svg,image/heic,image/heif,video/mp4,video/webm,video/quicktime,.avi,.wmv,.3gp,.flv,.mkv,.txt,.md"
      disabled={!modelSupportsFiles}
    >
      <div
        className={cn(
          "@container/main relative flex h-full flex-col items-center justify-end md:justify-center"
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
