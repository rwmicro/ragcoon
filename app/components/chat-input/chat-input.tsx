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
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { ArrowUpIcon, StopIcon } from "@phosphor-icons/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
// import { PromptSystem } from "../suggestions/prompt-system"
import { ButtonFileUpload } from "./button-file-upload"
import { ButtonSearch } from "./button-search"
import { FileList } from "./file-list"
import { VoiceButton } from "../voice/voice-button"
import dynamic from "next/dynamic"
import { useVoiceMode } from "@/app/hooks/use-voice-mode"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { ChatsCircle } from "@phosphor-icons/react"
import { CollectionSelector } from "@/app/components/rag/collection-selector"
import { useRAG } from "@/hooks/useRAG"
import { QueryMode, QueryModeSelector } from "./query-mode-selector"
import { useRAGSettings } from "@/lib/rag-settings-store"
import type { RAGSettings } from "@/lib/rag-settings-store"
import { Badge } from "@/components/ui/badge"
import { Cpu } from "@phosphor-icons/react"

// Dynamically import voice components to avoid SSR issues
const VoiceMode = dynamic(() => import("../voice/voice-mode").then((mod) => ({ default: mod.VoiceMode })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><div className="animate-pulse">Loading...</div></div>
})

const VoiceConversation = dynamic(() => import("../voice/voice-conversation").then((mod) => ({ default: mod.VoiceConversation })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><div className="animate-pulse">Loading...</div></div>
})

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
  lastAssistantMessage?: string
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
  lastAssistantMessage,
  queryMode,
  onQueryModeChange,
}: ChatInputProps) {
  const { models } = useModel()
  const { preferences } = useUserPreferences()
  const { activeCollectionId, setActiveCollectionId } = useRAG()
  const ragSettingsStore = useRAGSettings() as { settings: RAGSettings }

  const selectModelConfig = models.find((m) => m.id === selectedModel)
  // Enable web search for all models instead of checking webSearch capability
  const hasSearchSupport = true
  const isOnlyWhitespace = (text: string) => !/[^\s]/.test(text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false)
  const [isConversationModeOpen, setIsConversationModeOpen] = useState(false)

  const voiceHook = useVoiceMode({
    onTranscript: (text) => {
      onValueChange(text)
      setIsVoiceModeOpen(false)
    },
    onError: (error) => {
      console.error("Voice error:", error)
    },
  })

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current)
      }
    }
  }, [])

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
              {/* Voice conversation button */}
              {preferences.enableSTT && (
                <PromptInputAction tooltip="Voice Conversation">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-9 rounded-full"
                    disabled={isSubmitting}
                    type="button"
                    onClick={() => setIsConversationModeOpen(true)}
                    aria-label="Start voice conversation"
                  >
                    <ChatsCircle className="size-4" />
                  </Button>
                </PromptInputAction>
              )}

              {/* Voice button - inline mode */}
              {preferences.enableSTT && (
                <VoiceButton
                  status={voiceHook.status}
                  audioLevel={voiceHook.audioLevel}
                  onStart={() => setIsVoiceModeOpen(true)}
                  onStop={voiceHook.stopListening}
                  disabled={isSubmitting}
                  className="size-9"
                />
              )}
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

      {/* Voice Mode Dialog - Fullscreen */}
      <Dialog open={isVoiceModeOpen} onOpenChange={setIsVoiceModeOpen}>
        <DialogContent className="max-w-full h-screen w-screen p-0 m-0" hasCloseButton={false}>
          <VisuallyHidden.Root>
            <DialogTitle>Voice Mode</DialogTitle>
          </VisuallyHidden.Root>
          <VoiceMode
            onTranscript={(text) => {
              onValueChange(text)
              setIsVoiceModeOpen(false)
            }}
            onClose={() => setIsVoiceModeOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Voice Conversation Dialog - Fit content */}
      <Dialog open={isConversationModeOpen} onOpenChange={setIsConversationModeOpen}>
        <DialogContent className="max-w-4xl w-full p-0 m-0" hasCloseButton={false} customMaxWidth="56rem">
          <VisuallyHidden.Root>
            <DialogTitle>Voice Conversation</DialogTitle>
          </VisuallyHidden.Root>
          <VoiceConversation
            onTranscript={(text) => {
              // Set the value and auto-send only if we have text
              if (text && text.trim().length > 0) {
                onValueChange(text)

                // Clear any existing timeout
                if (sendTimeoutRef.current) {
                  clearTimeout(sendTimeoutRef.current)
                }

                // Wait a bit for the value to be set, then send
                sendTimeoutRef.current = setTimeout(() => {
                  onSend()
                }, 100)
              } else {
                console.warn("⚠️ Empty transcript received, not sending")
              }
            }}
            onClose={() => setIsConversationModeOpen(false)}
            lastResponse={lastAssistantMessage}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
