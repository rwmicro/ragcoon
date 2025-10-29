import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { cn } from "@/lib/utils"
import type { Message as MessageAISDK } from "@ai-sdk/react"
import { ArrowClockwise, Check, Copy } from "@phosphor-icons/react"
import { useCallback, useRef } from "react"
import { getSources } from "./get-sources"
import { QuoteButton } from "./quote-button"
import { Reasoning } from "./reasoning"
import { SearchImages } from "./search-images"
import { SourcesList } from "./sources-list"
import { ToolInvocation } from "./tool-invocation"
import { useAssistantMessageSelection } from "./useAssistantMessageSelection"
import type { Attachment } from "@ai-sdk/ui-utils"

// Stub RAG types and functions since RAG functionality has been removed
type ExtractedSource = any
const isRagResponse = (content: string) => false
const extractSourcesFromResponse = (content: string) => ({ cleanedContent: content, sources: [] })

type MessageAssistantProps = {
  children: string
  isLast?: boolean
  hasScrollAnchor?: boolean
  copied?: boolean
  copyToClipboard?: () => void
  onReload?: () => void
  parts?: MessageAISDK["parts"]
  status?: "streaming" | "ready" | "submitted" | "error"
  className?: string
  messageId: string
  onQuote?: (text: string, messageId: string) => void
  attachments?: Attachment[]
  ragModelName?: string
}

export function MessageAssistant({
  children,
  isLast,
  hasScrollAnchor,
  copied,
  copyToClipboard,
  onReload,
  parts,
  status,
  className,
  messageId,
  onQuote,
  attachments,
  ragModelName,
}: MessageAssistantProps) {
  const { preferences } = useUserPreferences()
  const sources = getSources(parts)
  const toolInvocationParts = parts?.filter(
    (part) => part.type === "tool-invocation"
  )
  const reasoningParts = parts?.find((part) => part.type === "reasoning")
  const contentNullOrEmpty = children === null || children === ""
  const isLastStreaming = status === "streaming" && isLast
  const isRagContent = isRagResponse(children || '')
  
  // Extract and clean sources from content
  const { cleanedContent, sources: extractedSources } = extractSourcesFromResponse(children || '')
  const displayContent = cleanedContent || children
  
  // Extract RAG sources from attachments
  const ragSources: ExtractedSource[] = attachments
    ?.filter(attachment => attachment.name === '__rag_sources__')
    ?.map(attachment => {
      try {
        return JSON.parse((attachment as any).data || '[]') as ExtractedSource[]
      } catch {
        return []
      }
    })
    .flat() || []
  
  console.log('[Debug] attachments:', attachments?.length || 0, attachments)
  console.log('[Debug] ragSources:', ragSources.length)
  
  const searchImageResults =
    parts
      ?.filter(
        (part) =>
          part.type === "tool-invocation" &&
          part.toolInvocation?.state === "result" &&
          part.toolInvocation?.toolName === "imageSearch" &&
          part.toolInvocation?.result?.content?.[0]?.type === "images"
      )
      .flatMap((part) =>
        part.type === "tool-invocation" &&
        part.toolInvocation?.state === "result" &&
        part.toolInvocation?.toolName === "imageSearch" &&
        part.toolInvocation?.result?.content?.[0]?.type === "images"
          ? (part.toolInvocation?.result?.content?.[0]?.results ?? [])
          : []
      ) ?? []

  const isQuoteEnabled = !preferences.multiModelEnabled
  const messageRef = useRef<HTMLDivElement>(null)
  const { selectionInfo, clearSelection } = useAssistantMessageSelection(
    messageRef,
    isQuoteEnabled
  )
  const handleQuoteBtnClick = useCallback(() => {
    if (selectionInfo && onQuote) {
      onQuote(selectionInfo.text, selectionInfo.messageId)
      clearSelection()
    }
  }, [selectionInfo, onQuote, clearSelection])

  return (
    <Message
      className={cn(
        "group flex w-full max-w-3xl flex-1 items-start gap-4 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor",
        className
      )}
    >
      <div
        ref={messageRef}
        className={cn(
          "relative flex min-w-full flex-col gap-2",
          isLast && "pb-8"
        )}
        {...(isQuoteEnabled && { "data-message-id": messageId })}
      >
        {reasoningParts && reasoningParts.reasoning && (
          <Reasoning
            reasoning={reasoningParts.reasoning}
            isStreaming={status === "streaming"}
          />
        )}

        {toolInvocationParts &&
          toolInvocationParts.length > 0 &&
          preferences.showToolInvocations && (
            <ToolInvocation toolInvocations={toolInvocationParts} />
          )}

        {searchImageResults.length > 0 && (
          <SearchImages results={searchImageResults} />
        )}

        {contentNullOrEmpty ? null : (
          <MessageContent
            className={cn(
              "prose dark:prose-invert relative min-w-full bg-transparent p-0 text-base",
              "prose-h1:scroll-m-20 prose-h1:text-xl prose-h1:font-semibold prose-h1:text-foreground dark:prose-h1:text-white prose-h2:mt-8 prose-h2:scroll-m-20 prose-h2:text-lg prose-h2:mb-3 prose-h2:font-medium prose-h2:text-foreground dark:prose-h2:text-white prose-h3:scroll-m-20 prose-h3:text-base prose-h3:font-medium prose-h3:text-foreground dark:prose-h3:text-white prose-h4:scroll-m-20 prose-h4:text-foreground dark:prose-h4:text-white prose-h5:scroll-m-20 prose-h5:text-foreground dark:prose-h5:text-white prose-h6:scroll-m-20 prose-h6:text-foreground dark:prose-h6:text-white prose-strong:font-medium prose-table:block prose-table:overflow-y-auto prose-ul:text-foreground dark:prose-ul:text-gray-200 prose-ol:text-foreground dark:prose-ol:text-gray-200 prose-li:text-foreground dark:prose-li:text-gray-200"
            )}
            markdown={true}
          >
            {displayContent}
          </MessageContent>
        )}

        {/* Show web search sources */}
        {sources && sources.length > 0 && <SourcesList sources={sources} />}

        {Boolean(isLastStreaming || contentNullOrEmpty) ? null : (
          <MessageActions
            className={cn(
              "-ml-2 flex gap-0 opacity-100"
            )}
          >
            <MessageAction
              tooltip={copied ? "Copied!" : "Copy text"}
              side="bottom"
            >
              <button
                className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
                aria-label="Copy text"
                onClick={copyToClipboard}
                type="button"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </MessageAction>
            {isLast ? (
              <MessageAction
                tooltip="Regenerate"
                side="bottom"
                delayDuration={0}
              >
                <button
                  className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
                  aria-label="Regenerate"
                  onClick={onReload}
                  type="button"
                >
                  <ArrowClockwise className="size-4" />
                </button>
              </MessageAction>
            ) : null}
          </MessageActions>
        )}

        {isQuoteEnabled && selectionInfo && selectionInfo.messageId && (
          <QuoteButton
            mousePosition={selectionInfo.position}
            onQuote={handleQuoteBtnClick}
            messageContainerRef={messageRef}
            onDismiss={clearSelection}
          />
        )}
      </div>
    </Message>
  )
}
