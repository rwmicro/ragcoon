"use client"

import { groupChatsByDate } from "@/app/components/history/utils"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { useChats } from "@/lib/chat-store/chats/provider"
import { APP_NAME } from "@/lib/config"
import {
  ChatTeardropText,
  Database,
  MagnifyingGlass,
  NotePencilIcon,
} from "@phosphor-icons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import {Sidebar as SidebarIconReact} from "@phosphor-icons/react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { HistoryTrigger } from "../../history/history-trigger"
import { SidebarList } from "./sidebar-list"
import { DialogCreateRAG } from "../../rag/dialog-create-rag"

export function AppSidebar() {
  const isMobile = useBreakpoint(768)
  const { toggleSidebar, setOpenMobile, state } = useSidebar()
  const { chats, isLoading } = useChats()
  const [isRAGDialogOpen, setIsRAGDialogOpen] = useState(false)
  const params = useParams<{ chatId: string }>()
  const currentChatId = params.chatId

  const groupedChats = useMemo(() => {
    const result = groupChatsByDate(chats, "")
    return result
  }, [chats])
  const hasChats = chats.length > 0
  const router = useRouter()

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-border/40 border-r bg-transparent"
    >
      <SidebarHeader className="h-14">
        <div className="flex items-center justify-between align-middle h-full ml-3 group-data-[collapsible=icon]:ml-1">
          <Link
            href="/"
            className="inline-flex items-center text-xl font-medium tracking-tight group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:ml-0 relative"
          >
            <div 
              className="relative group"
              onClick={(e) => {
                if (state === 'collapsed') {
                  e.preventDefault();
                  toggleSidebar();
                }
              }}
            >
              <Image
                src="/logo.jpg"
                alt={`${APP_NAME} Logo`}
                className="h-6 w-6 mr-2 rounded group-data-[collapsible=icon]:mr-0 cursor-pointer group-data-[collapsible=icon]:hover:scale-110 transition-transform"
                width={24}
                height={24}
              />
              
              {/* Hover tooltip for collapsed state */}
              {state === 'collapsed' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="absolute inset-0" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="z-50">
                    <p>{APP_NAME} - Click to expand</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <span className="group-data-[collapsible=icon]:hidden">{APP_NAME}</span>
          </Link>
          <button
            type="button"
            onClick={() => isMobile ? setOpenMobile(false) : toggleSidebar()}
            className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-9 items-center justify-center rounded-md bg-transparent transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none group-data-[collapsible=icon]:hidden"
          >
            <SidebarIconReact size={20} />
          </button>
        </div>
      </SidebarHeader>
      <SidebarContent className="border-border/40 border-t">
        <ScrollArea className="flex h-full px-3 [&>div>div]:!block">
          <div className="mt-3 mb-5 flex w-full flex-col items-start gap-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="hover:bg-accent/80 hover:text-foreground text-primary group/new-chat relative inline-flex w-full items-center rounded-md bg-transparent px-2 py-2 text-sm transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                  type="button"
                  onClick={() => router.push("/")}
                >
                  <NotePencilIcon size={20} className="group-data-[collapsible=icon]:mx-auto" />
                  <span className="ml-2 group-data-[collapsible=icon]:hidden">New Chat</span>
                  <div className="text-muted-foreground ml-auto text-xs opacity-0 duration-150 group-hover/new-chat:opacity-100 group-data-[collapsible=icon]:hidden">
                    ⌘⇧U
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent 
                side="right" 
                className="z-50"
                hidden={state !== "collapsed"}
              >
                <p>Start a new conversation</p>
              </TooltipContent>
            </Tooltip>

            {/* Create RAG Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="hover:bg-accent/80 hover:text-foreground text-primary group/create-rag relative inline-flex w-full items-center rounded-md bg-transparent px-2 py-2 text-sm transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                  type="button"
                  onClick={() => setIsRAGDialogOpen(true)}
                >
                  <Database size={20} className="group-data-[collapsible=icon]:mx-auto" />
                  <span className="ml-2 group-data-[collapsible=icon]:hidden">Create RAG</span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="z-50"
                hidden={state !== "collapsed"}
              >
                <p>Create a RAG knowledge base</p>
              </TooltipContent>
            </Tooltip>

            {state === 'collapsed' ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <HistoryTrigger
                      hasSidebar={false}
                      classNameTrigger="bg-transparent hover:bg-accent/80 hover:text-foreground text-primary relative inline-flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors group/search group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                      icon={<MagnifyingGlass size={24} className="group-data-[collapsible=icon]:mx-auto" />}
                      label={
                        <div className="flex w-full items-center gap-2 ml-2 group-data-[collapsible=icon]:hidden">
                          <span>Search</span>
                          <div className="text-muted-foreground ml-auto text-xs opacity-0 duration-150 group-hover/search:opacity-100">
                            ⌘+K
                          </div>
                        </div>
                      }
                      hasPopover={false}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="z-50">
                  <p>Search conversations</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <HistoryTrigger
                hasSidebar={false}
                classNameTrigger="bg-transparent hover:bg-accent/80 hover:text-foreground text-primary relative inline-flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors group/search group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                icon={<MagnifyingGlass size={24} className="group-data-[collapsible=icon]:mx-auto" />}
                label={
                  <div className="flex w-full items-center gap-2 ml-2 group-data-[collapsible=icon]:hidden">
                    <span>Search</span>
                    <div className="text-muted-foreground ml-auto text-xs opacity-0 duration-150 group-hover/search:opacity-100">
                      ⌘+K
                    </div>
                  </div>
                }
                hasPopover={false}
              />
            )}
          </div>
          {isLoading ? (
            <div className="h-full" />
          ) : hasChats ? (
            <div className="space-y-5">
              {groupedChats?.map((group) => (
                <SidebarList
                  key={group.name}
                  title={group.name}
                  items={group.chats}
                  currentChatId={currentChatId}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-[calc(100vh-160px)] flex-col items-center justify-center group-data-[collapsible=icon]:hidden">
              <ChatTeardropText
                size={24}
                className="text-muted-foreground mb-1 opacity-40"
              />
              <div className="text-muted-foreground text-center">
                <p className="mb-1 text-base font-medium">No chats yet</p>
                <p className="text-sm opacity-70">Start a new conversation</p>
              </div>
            </div>
          )}
        </ScrollArea>
      </SidebarContent>

      {/* Create RAG Dialog */}
      <DialogCreateRAG isOpen={isRAGDialogOpen} setIsOpen={setIsRAGDialogOpen} />
    </Sidebar>
  )
}
