import { Message as MessageType } from "@ai-sdk/react"
import React, { memo, useMemo, useState, useEffect, useRef } from "react"
import { MessageAssistant } from "./message-assistant"
import { MessageUser } from "./message-user"

type MessageProps = {
  variant: MessageType["role"]
  children: string
  id: string
  attachments?: MessageType["experimental_attachments"]
  isLast?: boolean
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  hasScrollAnchor?: boolean
  parts?: MessageType["parts"]
  status?: "streaming" | "ready" | "submitted" | "error"
  className?: string
  onQuote?: (text: string, messageId: string) => void
  currentModel?: string
  streamData?: any[] // Custom data from AI SDK stream
  chatId?: string | null
}

export const Message = memo(function Message({
  variant,
  children,
  id,
  attachments,
  isLast,
  onDelete,
  onEdit,
  onReload,
  hasScrollAnchor,
  parts,
  status,
  className,
  onQuote,
  currentModel,
  streamData,
  chatId,
}: MessageProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => setCopied(false), 500)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (variant === "user") {
    return (
      <MessageUser
        copied={copied}
        copyToClipboard={copyToClipboard}
        onReload={onReload}
        onEdit={onEdit}
        onDelete={onDelete}
        id={id}
        hasScrollAnchor={hasScrollAnchor}
        attachments={attachments}
        className={className}
      >
        {children}
      </MessageUser>
    )
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ragModelName = useMemo(
    () => currentModel?.startsWith('rag:') ? currentModel.replace('rag:', '') : undefined,
    [currentModel]
  )

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const enhancedAttachments = useMemo(() => {
    const base = attachments || []
    if (!streamData || !Array.isArray(streamData)) return base

    const extras: typeof base = []

    const ragSourcesData = streamData.find((item: any) => item?.type === 'rag_sources')
    if (ragSourcesData?.sources) {
      const sourcesBase64 = Buffer.from(JSON.stringify(ragSourcesData.sources)).toString('base64')
      extras.push({
        name: '__rag_sources__',
        contentType: 'application/json',
        url: `data:application/json;base64,${sourcesBase64}`,
      })
    }

    const traversalData = streamData.find((item: any) => item?.type === 'rag_graph_traversal')
    if (traversalData?.traversal) {
      const traversalBase64 = Buffer.from(JSON.stringify(traversalData.traversal)).toString('base64')
      extras.push({
        name: '__rag_graph_traversal__',
        contentType: 'application/json',
        url: `data:application/json;base64,${traversalBase64}`,
      })
    }

    return extras.length > 0 ? [...base, ...extras] : base
  }, [attachments, streamData])

  if (variant === "assistant") {
    return (
      <MessageAssistant
        copied={copied}
        copyToClipboard={copyToClipboard}
        onReload={onReload}
        isLast={isLast}
        hasScrollAnchor={hasScrollAnchor}
        parts={parts}
        status={status}
        className={className}
        messageId={id}
        onQuote={onQuote}
        attachments={enhancedAttachments}
        ragModelName={ragModelName}
        chatId={chatId || undefined}
      >
        {children}
      </MessageAssistant>
    )
  }

  return null
})
