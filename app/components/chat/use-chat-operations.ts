import { toast } from "@/components/ui/toast"
import type { Chats } from "@/lib/chat-store/types"
import { Message } from "@ai-sdk/react"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

type UseChatOperationsProps = {
  isAuthenticated: boolean
  chatId: string | null
  messages: Message[]
  selectedModel: string
  systemPrompt: string
  createNewChat: (
    userId: string,
    title?: string,
    model?: string,
    isAuthenticated?: boolean,
    systemPrompt?: string
  ) => Promise<Chats | undefined>
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[])
  ) => void
  setInput: (input: string) => void
}

export function useChatOperations({
  isAuthenticated,
  chatId,
  messages,
  selectedModel,
  systemPrompt,
  createNewChat,
  setMessages,
}: UseChatOperationsProps) {
  // Chat utilities - rate limits removed since using local models
  const router = useRouter()

  const ensureChatExists = async (userId: string, input: string) => {
    // If we're on the home page (no chatId) and no messages, create a new chat
    if (!chatId && messages.length === 0) {
      try {
        const newChat = await createNewChat(
          userId,
          input,
          selectedModel,
          isAuthenticated,
          systemPrompt
        )

        if (!newChat) return null

        return newChat.id
      } catch (err: unknown) {
        let errorMessage = "Something went wrong."
        try {
          const errorObj = err as { message?: string }
          if (errorObj.message) {
            const parsed = JSON.parse(errorObj.message)
            errorMessage = parsed.error || errorMessage
          }
        } catch {
          const errorObj = err as { message?: string }
          errorMessage = errorObj.message || errorMessage
        }
        toast({
          title: errorMessage,
          status: "error",
        })
        return null
      }
    }

    // If we have a chatId, use it
    return chatId
  }

  // Message handlers
  const handleDelete = useCallback(
    (id: string) => {
      setMessages(messages.filter((message) => message.id !== id))
    },
    [messages, setMessages]
  )

  const handleEdit = useCallback(
    (id: string, newText: string) => {
      setMessages(
        messages.map((message) =>
          message.id === id ? { ...message, content: newText } : message
        )
      )
    },
    [messages, setMessages]
  )

  return {
    // Utils
    ensureChatExists,

    // Handlers
    handleDelete,
    handleEdit,
  }
}
