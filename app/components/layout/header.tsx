"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { HeaderSidebarTrigger } from "./header-sidebar-trigger"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "@/components/ui/button"
import {
  ChatsCircle,
  Database,
  Gear,
  NotePencilIcon,
} from "@phosphor-icons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SettingsContent } from "./settings/settings-content"
import { HistoryTrigger } from "../history/history-trigger"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { APP_NAME } from "@/lib/config"
import {
  useSidebar,
} from "@/components/ui/sidebar"

export function Header({ showSidebar }: { showSidebar: boolean }) {
  const isMobile = useBreakpoint(768)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHistory, setHistory] = useState(false)
  const router = useRouter()
  const { toggleSidebar, state } = useSidebar()
  const showHeaderNav = !showSidebar

  return (
    <header className="h-app-header pointer-events-none fixed top-0 right-0 left-0 z-50">
      <div className={`relative mx-auto flex h-full max-w-full items-center justify-between px-4 sm:px-6 lg:px-8 ${showHeaderNav ? 'bg-background/80 backdrop-blur-md border-b border-border/50' : 'bg-transparent'}`}>
        <div className="flex flex-1 items-center justify-between">
          {/* Left side */}
          <div className="-ml-0.5 flex flex-1 items-center gap-2 lg:-ml-2.5">
            <div className="flex flex-1 items-center gap-2">
              {showSidebar && isMobile && <HeaderSidebarTrigger />}

              {/* Show logo and text when header navigation is enabled OR when sidebar is collapsed (and not mobile) */}
              {(showHeaderNav || (showSidebar && !isMobile)) && (
                <div className={`pointer-events-auto flex items-center gap-3 ${showSidebar && !isMobile ? 'opacity-0 group-data-[collapsible=icon]:opacity-100 transition-opacity duration-300' : ''}`}>
                  {/* Logo with RagCoon text */}
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      if (state === 'collapsed') {
                        toggleSidebar()
                      } else {
                        router.push("/")
                      }
                    }}
                  >
                    <Image
                      src="/logo.jpg"
                      alt={`${APP_NAME} Logo`}
                      className="h-8 w-8 rounded"
                      width={32}
                      height={32}
                    />
                    <span className="font-semibold text-lg tracking-tight">{APP_NAME}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div />

          {/* Right side */}
          <div className="pointer-events-auto flex flex-1 items-center justify-end gap-2">
            {/* Show navigation icons when header navigation is enabled */}
            {showHeaderNav && (
              <>
                {/* New Chat */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push("/")}
                    >
                      <NotePencilIcon className="size-5" weight="duotone" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>New Chat</p>
                  </TooltipContent>
                </Tooltip>

                {/* Search */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setHistory(true)}
                    >
                      <ChatsCircle className="size-5" weight="duotone" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>New Search</p>
                  </TooltipContent>
                </Tooltip>

                {/* History */}
                <HistoryTrigger hasSidebar={false} setHistory={setHistory} isHistory={isHistory} />

                {/* RAG Dashboard */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push("/rag")}
                    >
                      <Database className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>RAG Dashboard</p>
                  </TooltipContent>
                </Tooltip>

                {/* Settings */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsSettingsOpen(true)}
                    >
                      <Gear className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent
          customMaxWidth="1400px"
          className="flex h-[85vh] min-h-[600px] flex-col gap-0 p-0 top-[5%] translate-y-0"
        >
          <DialogHeader className="border-border border-b px-6 py-5">
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <SettingsContent />
        </DialogContent>
      </Dialog>
    </header>
  )
}
