"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VirtualList } from "@/components/ui/virtual-list"
import { Chats } from "@/lib/chat-store/types"
import {
  Check,
  PencilSimple,
  TrashSimple,
  X,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useState } from "react"
import { formatDate } from "./utils"

interface VirtualChatListProps {
  chats: Chats[]
  onSaveEdit: (id: string, newTitle: string) => Promise<void>
  onConfirmDelete: (id: string) => Promise<void>
  containerHeight: number
}

const ITEM_HEIGHT = 60 // Approximate height of each chat item

export function VirtualChatList({
  chats,
  onSaveEdit,
  onConfirmDelete,
  containerHeight
}: VirtualChatListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const { chatId } = useParams<{ chatId?: string }>()

  const handleStartEdit = useCallback((chat: Chats) => {
    setEditingId(chat.id)
    setEditValue(chat.title || "")
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (editingId && editValue.trim()) {
      await onSaveEdit(editingId, editValue.trim())
      setEditingId(null)
      setEditValue("")
    }
  }, [editingId, editValue, onSaveEdit])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditValue("")
  }, [])

  const handleStartDelete = useCallback((chatId: string) => {
    setDeletingId(chatId)
  }, [])

  const handleConfirmDelete = useCallback(async (chatId: string) => {
    await onConfirmDelete(chatId)
    setDeletingId(null)
  }, [onConfirmDelete])

  const handleCancelDelete = useCallback(() => {
    setDeletingId(null)
  }, [])

  const renderChatItem = useCallback((chat: Chats, index: number) => {
    const isActive = chatId === chat.id
    const isEditing = editingId === chat.id
    const isDeleting = deletingId === chat.id

    return (
      <div key={chat.id} className="flex items-center gap-2 px-2 py-2">
        {isEditing ? (
          <div className="bg-accent flex w-full items-center justify-between rounded-lg px-2 py-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveEdit()
              }}
              className="flex w-full items-center justify-between"
            >
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="mr-2 h-8 flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault()
                    handleCancelEdit()
                  }
                }}
              />
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  type="submit"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  type="button"
                  onClick={handleCancelEdit}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </form>
          </div>
        ) : isDeleting ? (
          <div className="bg-accent flex w-full items-center justify-between rounded-lg px-2 py-2.5">
            <div className="flex flex-1 items-center">
              <span className="text-base font-normal">{chat.title}</span>
            </div>
            <div className="ml-2 flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive h-8 w-8"
                onClick={() => handleConfirmDelete(chat.id)}
              >
                <Check className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleCancelDelete}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Link
              href={`/c/${chat.id}`}
              className={`group flex flex-1 items-center rounded-lg px-2 py-2.5 text-left hover:bg-accent ${
                isActive ? "bg-accent" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-normal">
                  {chat.title}
                </p>
                <p className="text-muted-foreground truncate text-sm">
                  {formatDate(chat.updated_at || chat.created_at)}
                </p>
              </div>
            </Link>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                onClick={() => handleStartEdit(chat)}
              >
                <PencilSimple className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive h-8 w-8 opacity-0 group-hover:opacity-100"
                onClick={() => handleStartDelete(chat.id)}
              >
                <TrashSimple className="size-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }, [chatId, editingId, deletingId, editValue, handleSaveEdit, handleCancelEdit, handleStartEdit, handleStartDelete, handleConfirmDelete, handleCancelDelete])

  return (
    <VirtualList
      items={chats}
      itemHeight={ITEM_HEIGHT}
      containerHeight={containerHeight}
      renderItem={renderChatItem}
      overscan={3}
      className="w-full"
    />
  )
}