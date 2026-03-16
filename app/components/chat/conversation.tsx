import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container"
import { Loader } from "@/components/prompt-kit/loader"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { Message as MessageType } from "@ai-sdk/react"
import { memo, useRef } from "react"
import { Message } from "./message"

type ConversationProps = {
  messages: MessageType[]
  status?: "streaming" | "ready" | "submitted" | "error"
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  onQuote?: (text: string, messageId: string) => void
  currentModel?: string
  chatId?: string | null
  streamData?: any[] // Custom data from AI SDK stream
}

export const Conversation = memo(function Conversation({
  messages,
  status = "ready",
  onDelete,
  onEdit,
  onReload,
  onQuote,
  currentModel,
  chatId,
  streamData,
}: ConversationProps) {
  const initialMessageCount = useRef(messages.length)

  // Handle empty message state:
  // - If no messages and status is "ready", show empty state (user hasn't submitted yet)
  // - If no messages and status is "submitted" or "streaming", continue to render (will show loader below)
  if ((!messages || messages.length === 0) && status === "ready") {
    return <div className="h-full w-full"></div>
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-x-hidden overflow-y-auto">
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 mx-auto flex w-full flex-col justify-center">
        <div className="h-app-header bg-background flex w-full lg:hidden lg:h-0" />
        <div className="h-app-header bg-background flex w-full mask-b-from-4% mask-b-to-100% lg:hidden" />
      </div>
      <ChatContainerRoot className="relative w-full">
        <ChatContainerContent
          className="flex w-full flex-col items-center pt-20 pb-4"
          style={{
            scrollbarGutter: "stable both-edges",
            scrollbarWidth: "none",
          }}
        >
          {messages?.map((message, index) => {
            const isLast =
              index === messages.length - 1 && status !== "submitted"
            const hasScrollAnchor =
              isLast && messages.length > initialMessageCount.current

            return (
              <Message
                key={message.id}
                id={message.id}
                variant={message.role}
                attachments={message.experimental_attachments}
                isLast={isLast}
                onDelete={onDelete}
                onEdit={onEdit}
                onReload={onReload}
                hasScrollAnchor={hasScrollAnchor}
                parts={message.parts}
                status={isLast ? status : "ready"}
                onQuote={onQuote}
                currentModel={currentModel}
                streamData={isLast ? streamData : undefined}
                chatId={chatId}
              >
                {message.content}
              </Message>
            )
          })}
          {(() => {
            const lastMessage = messages[messages.length - 1]
            const lastMessageHasReasoning =
              lastMessage?.role === "assistant" &&
              lastMessage.parts?.some((p: any) => p.type === "reasoning" && p.reasoning)
            const shouldShowLoader =
              status === "submitted" ||
              (status === "streaming" && (
                messages.length === 0 ||
                lastMessage?.role === "user" ||
                (lastMessage?.role === "assistant" && !lastMessage.content && !lastMessageHasReasoning)
              ))
            return shouldShowLoader ? (
              <div className="flex w-full max-w-3xl flex-col items-start gap-2 px-6 pb-2">
                <Loader />
              </div>
            ) : null
          })()}

          <div className="absolute bottom-0 flex w-full max-w-3xl flex-1 items-end justify-end gap-4 px-6 pb-2">
            <ScrollButton className="absolute top-[-50px] right-[30px]" />
          </div>
        </ChatContainerContent>
      </ChatContainerRoot>
    </div>
  )
})
