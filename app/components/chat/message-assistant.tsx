import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { useFeedbackStore } from "@/lib/feedback-store"
import { cn } from "@/lib/utils"
import type { Message as MessageAISDK } from "@ai-sdk/react"
import { ArrowClockwise, Check, Copy, SpeakerHigh, Stop, Database, X, CaretDown, CaretRight, ThumbsUp, ThumbsDown, Warning, Lightbulb } from "@phosphor-icons/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { getSources, getWebSources } from "./get-sources"
import { WebSourceBubbles } from "./web-source-bubbles"
import { QuoteButton } from "./quote-button"
import { Reasoning } from "./reasoning"
import { SearchImages } from "./search-images"
import { SourcesList } from "./sources-list"
import { ToolInvocation } from "./tool-invocation"
import { useAssistantMessageSelection } from "./useAssistantMessageSelection"
import type { Attachment } from "@ai-sdk/ui-utils"
import { useTTS } from "@/app/hooks/use-tts"
import { useExport } from "@/app/hooks/use-export"
import { Export } from "@phosphor-icons/react"

// RAG source types
type ExtractedSource = {
  filename: string
  chunkIndex: number
  pageNumber?: number
  content: string
  score: number
}

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
  chatId?: string
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
  chatId,
}: MessageAssistantProps) {
  const { preferences } = useUserPreferences()
  const { speak, stop, isPlaying } = useTTS()
  const { getFeedback, addFeedback, updateFeedback } = useFeedbackStore()
  const feedback = getFeedback(messageId)
  const { exportAsMarkdown, copyConversationLink } = useExport()
  const sources = useMemo(() => getSources(parts), [parts])
  const webSources = useMemo(() => getWebSources(parts), [parts])
  const toolInvocationParts = useMemo(
    () => parts?.filter((part) => part.type === "tool-invocation"),
    [parts]
  )
  const hasWebSearchTool = useMemo(
    () => toolInvocationParts?.some((part) => part.toolInvocation?.toolName === "web_search"),
    [toolInvocationParts]
  )
  const reasoningParts = useMemo(
    () => parts?.find((part) => part.type === "reasoning"),
    [parts]
  )

  const contentNullOrEmpty = children === null || children === ""
  const isLastStreaming = status === "streaming" && isLast

  // Extract RAG sources from attachments — base64 decode only when attachments change
  const ragSources = useMemo((): ExtractedSource[] => {
    return attachments
      ?.filter(a => a.name === '__rag_sources__')
      ?.map(attachment => {
        try {
          const url = attachment.url
          if (!url) return []
          if (url.startsWith('data:')) {
            const base64Data = url.split(',')[1]
            if (base64Data) return JSON.parse(atob(base64Data)) as ExtractedSource[]
          }
          return JSON.parse(url) as ExtractedSource[]
        } catch {
          return []
        }
      })
      .flat() || []
  }, [attachments])

  const hasRagSources = ragSources.length > 0
  const [openSourceIndex, setOpenSourceIndex] = useState<number | null>(null)
  const [isSourcesOpen, setIsSourcesOpen] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Update popover position when opening
  useEffect(() => {
    if (openSourceIndex !== null && buttonRefs.current[openSourceIndex]) {
      const button = buttonRefs.current[openSourceIndex]
      const rect = button.getBoundingClientRect()
      setPopoverPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      })
    } else {
      setPopoverPosition(null)
    }
  }, [openSourceIndex])

  const searchImageResults = useMemo(
    () =>
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
        ) ?? [],
    [parts]
  )

  const isQuoteEnabled = true
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

  // Feedback handlers
  const handleThumbsUp = useCallback(() => {
    if (feedback?.type === "positive") {
      // Remove feedback if clicking again
      updateFeedback(messageId, { type: "neutral" })
    } else {
      addFeedback({
        messageId,
        chatId: "", // Would need to pass chatId as prop
        type: "positive",
        timestamp: Date.now(),
      })
    }
  }, [feedback, messageId, addFeedback, updateFeedback])

  const handleThumbsDown = useCallback(() => {
    if (feedback?.type === "negative") {
      // Remove feedback if clicking again
      updateFeedback(messageId, { type: "neutral" })
    } else {
      addFeedback({
        messageId,
        chatId: chatId || "",
        type: "negative",
        timestamp: Date.now(),
      })
    }
  }, [feedback, messageId, chatId, addFeedback, updateFeedback])

  const handleExport = useCallback(() => {
    exportAsMarkdown([
      {
        role: "assistant",
        content: children,
        timestamp: Date.now(),
      },
    ], "Assistant Response")
  }, [children, exportAsMarkdown])

  const handleCopyLink = useCallback(() => {
    if (chatId) {
      copyConversationLink(chatId)
    }
  }, [chatId, copyConversationLink])

  const avgSourceScore = useMemo(
    () => ragSources.length > 0
      ? ragSources.reduce((acc, s) => acc + s.score, 0) / ragSources.length
      : 1,
    [ragSources]
  )

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
    if (score >= 0.5) return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
    return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
  }

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return "High Confidence"
    if (score >= 0.5) return "Medium Confidence"
    return "Low Confidence"
  }

  const showLowRelevanceWarning = hasRagSources && avgSourceScore < 0.5

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
            {children}
          </MessageContent>
        )}

        {/* Show web search sources */}
        {sources && sources.length > 0 && <SourcesList sources={sources} />}

        {/* Web search / read_page source bubbles */}
        {webSources.length > 0 && !isLastStreaming && (
          <WebSourceBubbles sources={webSources} />
        )}

        {/* Low Relevance Warning */}
        {showLowRelevanceWarning && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 animate-in fade-in slide-in-from-bottom-2">
            <Warning className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" weight="fill" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Sources may not be highly relevant
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                The retrieved sources have low relevance scores. The answer might not be fully accurate.
              </p>
            </div>
          </div>
        )}

        {/* Confidence Indicator for RAG responses */}
        {hasRagSources && !isLastStreaming && (
          <div className="mt-4 flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs", getConfidenceColor(avgSourceScore))}
            >
              {getConfidenceLabel(avgSourceScore)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Avg. relevance: {Math.round(avgSourceScore * 100)}%
            </span>
          </div>
        )}

        {/* Show RAG sources - Redesigned UI */}
        {hasRagSources && (
          <div className="mt-6 border-t border-border/50 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <button
              onClick={() => setIsSourcesOpen(!isSourcesOpen)}
              className="mb-3 flex items-center gap-2 hover:bg-muted/50 p-1 -ml-1 rounded-md transition-colors cursor-pointer group/sources"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-1 rounded-md group-hover/sources:bg-muted/50 transition-colors">
                <Database className="size-3.5" weight="duotone" />
                <span>Sources used</span>
              </div>
              <span className="text-[10px] text-muted-foreground/60">
                {ragSources.length} reference{ragSources.length > 1 ? 's' : ''}
              </span>
              {isSourcesOpen ? (
                <CaretDown className="size-3 text-muted-foreground" />
              ) : (
                <CaretRight className="size-3 text-muted-foreground" />
              )}
            </button>

            {isSourcesOpen && (
              <div className="grid gap-2 sm:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-300">
                {ragSources.map((source, idx) => {
                  const scorePercent = Math.round(source.score * 100)
                  const isOpen = openSourceIndex === idx

                  // Determine relevance color
                  const relevanceColor =
                    scorePercent >= 85 ? "text-green-500 bg-green-500/10 border-green-500/20" :
                      scorePercent >= 70 ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" :
                        "text-orange-500 bg-orange-500/10 border-orange-500/20"

                  return (
                    <div key={idx} className="group relative">
                      <button
                        ref={(el) => { buttonRefs.current[idx] = el }}
                        onClick={() => setOpenSourceIndex(isOpen ? null : idx)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-lg border bg-card/50 p-3 text-left transition-all hover:bg-accent/5 hover:shadow-sm",
                          isOpen && "ring-1 ring-primary/30 bg-accent/10"
                        )}
                      >
                        <div className="shrink-0 mt-0.5">
                          <div className="size-8 rounded-md bg-background border flex items-center justify-center shadow-sm">
                            {source.filename.endsWith('.pdf') ? (
                              <span className="text-red-500 text-xs font-bold">PDF</span>
                            ) : (
                              <span className="text-blue-500 text-xs font-bold">MD</span>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-medium truncate text-foreground/90">
                              {source.filename}
                            </span>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0", relevanceColor)}>
                              {scorePercent}% match
                            </span>
                          </div>

                          <div className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {source.content}
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground/70">
                            {source.pageNumber && (
                              <span className="flex items-center gap-1">
                                Page {source.pageNumber}
                              </span>
                            )}
                            <span>•</span>
                            <span>Chunk {source.chunkIndex + 1}</span>
                          </div>
                        </div>
                      </button>

                      {/* Popover for full content */}
                      {isOpen && popoverPosition && typeof window !== 'undefined' && createPortal(
                        <>
                          <div
                            className="fixed inset-0 z-[9998]"
                            onClick={() => setOpenSourceIndex(null)}
                          />
                          <div
                            className="fixed z-[9999] w-[450px] max-w-[90vw] rounded-xl border border-border bg-popover p-0 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                            style={{
                              top: `${popoverPosition.top}px`,
                              left: `${popoverPosition.left}px`,
                            }}
                          >
                            <div className="flex items-center justify-between border-b p-3 bg-muted/30">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-semibold truncate">
                                  {source.filename}
                                </span>
                                {source.pageNumber && (
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    Page {source.pageNumber}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => setOpenSourceIndex(null)}
                                className="rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X className="size-4" />
                              </button>
                            </div>

                            <div className="p-4 max-h-[400px] overflow-y-auto">
                              <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-muted/20 border">
                                <div className="flex-1">
                                  <div className="flex justify-between text-xs mb-1.5">
                                    <span className="font-medium text-muted-foreground">Relevance Score</span>
                                    <span className={cn("font-bold",
                                      scorePercent >= 85 ? "text-green-600" :
                                        scorePercent >= 70 ? "text-yellow-600" :
                                          "text-orange-600"
                                    )}>{scorePercent}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn("h-full rounded-full transition-all duration-500",
                                        scorePercent >= 85 ? "bg-green-500" :
                                          scorePercent >= 70 ? "bg-yellow-500" :
                                            "bg-orange-500"
                                      )}
                                      style={{ width: `${scorePercent}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-foreground/90 bg-background p-3 rounded-md border">
                                {source.content}
                              </div>
                            </div>

                            <div className="p-2 border-t bg-muted/10 flex justify-end">
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpenSourceIndex(null)}>
                                Close
                              </Button>
                            </div>
                          </div>
                        </>,
                        document.body
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

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
            {preferences.enableTTS && (
              <MessageAction
                tooltip={isPlaying ? "Stop speaking" : "Read aloud"}
                side="bottom"
              >
                <button
                  className={cn(
                    "hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition",
                    isPlaying && "text-blue-500"
                  )}
                  aria-label={isPlaying ? "Stop speaking" : "Read aloud"}
                  onClick={() => isPlaying ? stop() : speak(children)}
                  type="button"
                >
                  {isPlaying ? (
                    <Stop className="size-4" weight="fill" />
                  ) : (
                    <SpeakerHigh className="size-4" />
                  )}
                </button>
              </MessageAction>
            )}
            {/* Feedback buttons */}
            <MessageAction
              tooltip={feedback?.type === "positive" ? "Remove feedback" : "Helpful"}
              side="bottom"
            >
              <button
                className={cn(
                  "hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition",
                  feedback?.type === "positive" && "text-green-600 dark:text-green-400"
                )}
                aria-label="Thumbs up"
                onClick={handleThumbsUp}
                type="button"
              >
                <ThumbsUp className="size-4" weight={feedback?.type === "positive" ? "fill" : "regular"} />
              </button>
            </MessageAction>
            <MessageAction
              tooltip={feedback?.type === "negative" ? "Remove feedback" : "Not helpful"}
              side="bottom"
            >
              <button
                className={cn(
                  "hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition",
                  feedback?.type === "negative" && "text-red-600 dark:text-red-400"
                )}
                aria-label="Thumbs down"
                onClick={handleThumbsDown}
                type="button"
              >
                <ThumbsDown className="size-4" weight={feedback?.type === "negative" ? "fill" : "regular"} />
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
            <MessageAction
              tooltip="Export message"
              side="bottom"
            >
              <button
                className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
                aria-label="Export message"
                onClick={handleExport}
                type="button"
              >
                <Export className="size-4" />
              </button>
            </MessageAction>
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
