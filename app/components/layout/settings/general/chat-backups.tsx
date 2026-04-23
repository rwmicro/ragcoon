"use client"

import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useChats } from "@/lib/chat-store/chats/provider"
import { DownloadSimple, Info, UploadSimple } from "@phosphor-icons/react"
import { useRef, useState } from "react"

type ExportedMessage = {
  role: "user" | "assistant" | "system"
  content: string
  createdAt?: string
}

type ExportedChat = {
  id?: string
  title?: string
  model?: string
  created_at?: string
  messages: ExportedMessage[]
}

type ImportPayload = ExportedChat | ExportedChat[] | { chats: ExportedChat[] }

const VALID_ROLES = new Set(["user", "assistant", "system"])

function normalizePayload(raw: unknown): ExportedChat[] {
  if (Array.isArray(raw)) return raw as ExportedChat[]
  if (raw && typeof raw === "object") {
    const asRecord = raw as Record<string, unknown>
    if (Array.isArray(asRecord.chats)) return asRecord.chats as ExportedChat[]
    if (Array.isArray(asRecord.messages)) return [raw as ExportedChat]
  }
  throw new Error("Unrecognized backup format")
}

function validateChat(chat: ExportedChat, index: number): string | null {
  if (!chat || typeof chat !== "object") return `Entry #${index + 1} is not an object`
  if (typeof chat.title !== "string" || chat.title.length === 0) {
    return `Entry #${index + 1} missing title`
  }
  if (!Array.isArray(chat.messages)) {
    return `Entry #${index + 1} missing messages array`
  }
  for (let i = 0; i < chat.messages.length; i++) {
    const m = chat.messages[i]
    if (!m || typeof m.content !== "string" || !VALID_ROLES.has(m.role)) {
      return `Entry #${index + 1}, message #${i + 1} is invalid`
    }
  }
  return null
}

export function ChatBackups() {
  const { refresh, chats } = useChats()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handlePickFile = () => inputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File is too large (max 50MB)")
      return
    }

    setIsImporting(true)
    try {
      const text = await file.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error("File is not valid JSON")
      }

      const chatsToImport = normalizePayload(parsed)
      if (chatsToImport.length === 0) {
        throw new Error("No chats found in backup")
      }

      for (let i = 0; i < chatsToImport.length; i++) {
        const err = validateChat(chatsToImport[i], i)
        if (err) throw new Error(err)
      }

      let imported = 0
      let failed = 0

      for (const chat of chatsToImport) {
        try {
          const createRes = await fetch("/api/sqlite/chats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "import",
              data: {
                id: chat.id,
                title: chat.title,
                model: chat.model,
                created_at: chat.created_at,
              },
            }),
          })
          const createJson = await createRes.json()
          if (!createRes.ok || !createJson.success) {
            throw new Error(createJson.error || "Failed to create chat")
          }
          const newChatId = createJson.data.id as string

          if (chat.messages.length > 0) {
            const msgRes = await fetch("/api/sqlite/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "createMany",
                chatId: newChatId,
                data: chat.messages.map((m) => ({
                  role: m.role,
                  content: m.content,
                  createdAt: m.createdAt,
                })),
              }),
            })
            const msgJson = await msgRes.json()
            if (!msgRes.ok || !msgJson.success) {
              throw new Error(msgJson.error || "Failed to insert messages")
            }
          }
          imported++
        } catch (err) {
          console.error("[ChatBackups] Import failed for chat:", err)
          failed++
        }
      }

      await refresh()

      if (failed === 0) {
        toast.success(`Imported ${imported} chat${imported === 1 ? "" : "s"}`)
      } else {
        toast.warning(`Imported ${imported}, ${failed} failed`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed"
      toast.error(message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleExportAll = async () => {
    if (chats.length === 0) {
      toast.info("No chats to export")
      return
    }
    setIsExporting(true)
    try {
      const allChats: ExportedChat[] = []
      for (const chat of chats) {
        const res = await fetch("/api/sqlite/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get", chatId: chat.id }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) continue
        const messages = (json.data as Array<{
          role: string
          content: string
          createdAt: string | Date
        }>).map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          createdAt:
            typeof m.createdAt === "string"
              ? m.createdAt
              : new Date(m.createdAt).toISOString(),
        }))
        allChats.push({
          id: chat.id,
          title: chat.title ?? "Untitled",
          model: chat.model ?? undefined,
          created_at: chat.created_at ?? undefined,
          messages,
        })
      }

      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        chats: allChats,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ragcoon-backup-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${allChats.length} chat${allChats.length === 1 ? "" : "s"}`)
    } catch (err) {
      console.error("[ChatBackups] Export failed:", err)
      toast.error("Export failed")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Chat Backups</h4>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="size-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>Import or export all your chats as a JSON file. Individual chat exports are available from each chat menu.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePickFile}
          disabled={isImporting}
        >
          <UploadSimple className="size-4" />
          {isImporting ? "Importing..." : "Import backup"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportAll}
          disabled={isExporting || chats.length === 0}
        >
          <DownloadSimple className="size-4" />
          {isExporting ? "Exporting..." : "Export all"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Supported: single-chat JSON (from chat menu) or full backup
        (<code>{"{ chats: [...] }"}</code>).
      </p>
    </div>
  )
}
