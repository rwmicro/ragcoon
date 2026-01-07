"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useChats } from "@/lib/chat-store/chats/provider"
import { useMessages } from "@/lib/chat-store/messages/provider"
import { useChatSession } from "@/lib/chat-store/session/provider"
import { cn } from "@/lib/utils"
import { ListMagnifyingGlass } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CommandHistory } from "./command-history"
import { DrawerHistory } from "./drawer-history"

type HistoryTriggerProps = {
  hasSidebar: boolean
  classNameTrigger?: string
  label?: React.ReactNode | string
  hasPopover?: boolean
  isHistory?: boolean
  setHistory: (open: boolean) => void
}

export function HistoryTrigger({
  hasSidebar,
  classNameTrigger,
  label,
  hasPopover = true,
  setHistory,
  isHistory
}: HistoryTriggerProps) {
  const isMobile = useBreakpoint(768)
  const router = useRouter()
  const { chats, updateTitle, deleteChat } = useChats()
  const { deleteMessages } = useMessages()
  const { chatId } = useChatSession()

  const handleSaveEdit = async (id: string, newTitle: string) => {
    await updateTitle(id, newTitle)
  }

  const handleConfirmDelete = async (id: string) => {
    if (id === chatId) {
      setHistory(false)
    }
    await deleteMessages()
    await deleteChat(id, chatId!, () => router.push("/"))
  }

  const trigger = (
    <button className={cn(classNameTrigger)}>
      {label || <ListMagnifyingGlass className="size-5" />}
    </button>
  )


  if (isMobile) {
    return (
      <DrawerHistory
        chatHistory={chats}
        onSaveEdit={handleSaveEdit}
        onConfirmDelete={handleConfirmDelete}
        isHistory={isHistory ?? false}
        setIsOpen={setHistory}
      />
    )
  }

  return (
    <CommandHistory
      chatHistory={chats}
      onSaveEdit={handleSaveEdit}
      onConfirmDelete={handleConfirmDelete}
      trigger={trigger}
      isHistory={isHistory ?? false}
      setIsOpen={setHistory}
      onOpenChange={setHistory}
      hasPopover={hasPopover}
    />
  )
}
