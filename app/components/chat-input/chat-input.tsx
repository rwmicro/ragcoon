"use client"

import { ModelSelector } from "@/components/common/model-selector/base"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { Button } from "@/components/ui/button"
import { useModel } from "@/lib/model-store/provider"
import { ArrowUpIcon, StopIcon } from "@phosphor-icons/react"
import { useCallback, useEffect, useMemo, useRef } from "react"
// import { PromptSystem } from "../suggestions/prompt-system"
import { ButtonFileUpload } from "./button-file-upload"
import { ButtonSearch } from "./button-search"
import { FileList } from "./file-list"
import { CollectionSelector } from "@/app/components/rag/collection-selector"
import { useRAG } from "@/hooks/useRAG"
import { QueryMode, QueryModeSelector } from "./query-mode-selector"
import { useRAGSettings } from "@/lib/rag-settings-store"
import type { RAGSettings } from "@/lib/rag-settings-store"
import { Badge } from "@/components/ui/badge"
import { Cpu } from "@phosphor-icons/react"

type ChatInputProps = {
  value: string
  onValueChange: (value: string) => void
  onSend: () => void
  isSubmitting?: boolean
  hasMessages?: boolean
  files: File[]
  onFileUpload: (files: File[]) => void
  onFileRemove: (file: File) => void
  onSelectModel: (model: string) => void
  selectedModel: string
  stop: () => void
  status?: "submitted" | "streaming" | "ready" | "error"
  setEnableSearch: (enabled: boolean) => void
  enableSearch: boolean
  quotedText?: { text: string; messageId: string } | null
  queryMode: QueryMode
  onQueryModeChange: (mode: QueryMode) => void
}

export function ChatInput({
  value,
  onValueChange,
  onSend,
  isSubmitting,
  files,
  onFileUpload,
  onFileRemove,
  onSelectModel,
  selectedModel,
  stop,
  status,
  setEnableSearch,
  enableSearch,
  quotedText,
  queryMode,
  onQueryModeChange,
}: ChatInputProps) {
  const { models } = useModel()
  const { activeCollectionId, setActiveCollectionId } = useRAG()
  const ragSettingsStore = useRAGSettings() as { settings: RAGSettings }

  const selectModelConfig = models.find((m) => m.id === selectedModel)
  // Enable web search for all models instead of checking webSearch capability
  const hasSearchSupport = true
  const isOnlyWhitespace = (text: string) => !/[^\s]/.test(text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    if (isSubmitting) {
      return
    }

    if (status === "streaming") {
      stop()
      return
    }

    onSend()
  }, [isSubmitting, onSend, status, stop])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isSubmitting) {
        e.preventDefault()
        return
      }

      if (e.key === "Enter" && status === "streaming") {
        e.preventDefault()
        return
      }

      if (e.key === "Enter" && !e.shiftKey) {
        if (isOnlyWhitespace(value)) {
          return
        }

        e.preventDefault()
        onSend()
      }
    },
    [isSubmitting, onSend, status, value]
  )

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const hasImageContent = Array.from(items).some((item) =>
        item.type.startsWith("image/")
      )

      if (hasImageContent) {
        const imageFiles: File[] = []

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile()
            if (file) {
              const newFile = new File(
                [file],
                `pasted-image-${Date.now()}.${file.type.split("/")[1]}`,
                { type: file.type }
              )
              imageFiles.push(newFile)
            }
          }
        }

        if (imageFiles.length > 0) {
          onFileUpload(imageFiles)
        }
      }
      // Text pasting will work by default for everyone
    },
    [onFileUpload]
  )

  useEffect(() => {
    if (quotedText) {
      const quoted = quotedText.text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")
      onValueChange(value ? `${value}\n\n${quoted}\n\n` : `${quoted}\n\n`)

      const rafId = requestAnimationFrame(() => {
        textareaRef.current?.focus()
      })

      return () => {
        cancelAnimationFrame(rafId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotedText, onValueChange])

  // Removed useMemo that disabled search for models without webSearch support
  // Now all models can use web search

  return (
    <div className="relative flex w-full flex-col gap-4">
      {/* {hasSuggestions && (
        <PromptSystem
          onValueChange={onValueChange}
          onSuggestion={onSuggestion}
          value={value}
        />
      )} */}
      <div className="relative order-2 px-2 pb-3 sm:pb-4 md:order-1">
        <PromptInput
          className="bg-popover relative z-10 p-0 pt-1 shadow-xs backdrop-blur-xl"
          maxHeight={200}
          value={value}
          onValueChange={onValueChange}
        >
          <FileList files={files} onFileRemove={onFileRemove} />
          <PromptInputTextarea
            ref={textareaRef}
            placeholder="Ask RagCoon"
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
          />
          <PromptInputActions className="mt-3 w-full justify-between p-2">
            <div className="flex gap-2 items-center flex-wrap">
              <ButtonFileUpload
                onFileUpload={onFileUpload}
                model={selectedModel}
              />
              <ModelSelector
                selectedModelId={selectedModel}
                setSelectedModelId={onSelectModel}
                className="rounded-full"
              />
              <CollectionSelector
                selectedCollectionId={activeCollectionId}
                onSelectCollection={setActiveCollectionId}
              />
              {activeCollectionId && (
                <>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50 text-secondary-foreground border border-border/50">
                    <Cpu className="size-3.5" weight="fill" />
                    <span className="text-xs font-medium truncate max-w-[150px]">
                      {ragSettingsStore.settings.ingestion.embeddingModel.split('/').pop()}
                    </span>
                  </div>
                  <QueryModeSelector
                    value={queryMode}
                    onChange={onQueryModeChange}
                    variant="compact"
                  />
                </>
              )}
              <ButtonSearch
                isSelected={enableSearch}
                onToggle={setEnableSearch}
              />
            </div>
            <div className="flex gap-2">
              <PromptInputAction
                tooltip={status === "streaming" ? "Stop" : "Send"}
              >
                <Button
                  size="sm"
                  className="size-9 rounded-full transition-all duration-300 ease-out"
                  disabled={Boolean(!value || isSubmitting || isOnlyWhitespace(value))}
                  type="button"
                  onClick={handleSend}
                  aria-label={status === "streaming" ? "Stop" : "Send message"}
                >
                  {status === "streaming" ? (
                    <StopIcon className="size-4" />
                  ) : (
                    <ArrowUpIcon className="size-4" />
                  )}
                </Button>
              </PromptInputAction>
            </div>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  )
}
