"use client"

import { HistoryTrigger } from "@/app/components/history/history-trigger"
import { ButtonNewChat } from "@/app/components/layout/button-new-chat"
import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { DialogPublish } from "./dialog-publish"
import { HeaderSidebarTrigger } from "./header-sidebar-trigger"
import { ThemeToggle } from "./theme-toggle"

export function Header({ hasSidebar }: { hasSidebar: boolean }) {
  const isMobile = useBreakpoint(768)
  const { preferences } = useUserPreferences()
  const isMultiModelEnabled = preferences.multiModelEnabled

  return (
    <header className="h-app-header pointer-events-none fixed top-0 right-0 left-0 z-50">
      <div className="relative mx-auto flex h-full max-w-full items-center justify-between bg-transparent px-4 sm:px-6 lg:bg-transparent lg:px-8">
        <div className="flex flex-1 items-center justify-between">
          <div className="-ml-0.5 flex flex-1 items-center gap-2 lg:-ml-2.5">
            <div className="flex flex-1 items-center gap-2">
              {hasSidebar && isMobile && <HeaderSidebarTrigger />}
            </div>
          </div>
          <div />
          <div className="pointer-events-auto flex flex-1 items-center justify-end gap-2">
            {!isMultiModelEnabled && <DialogPublish />}
            <ThemeToggle />
            <ButtonNewChat />
            {!hasSidebar && <HistoryTrigger hasSidebar={hasSidebar} />}
          </div>
        </div>
      </div>
    </header>
  )
}
