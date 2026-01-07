"use client"

import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { RAGDashboardComplete } from "@/app/components/rag/rag-dashboard-complete"
import { useUserPreferences } from "@/lib/user-preference-store/provider"

export default function RAGDashboard() {
  const { preferences } = useUserPreferences()
  const showSidebar = preferences.navigationPosition === "sidebar"

  return (
    <MessagesProvider>
      <LayoutApp>
        <div className={`container mx-auto px-4 max-w-7xl h-full w-full overflow-y-auto ${showSidebar ? 'pt-6 pb-8' : 'pt-20 pb-8'}`}>
          <RAGDashboardComplete />
        </div>
      </LayoutApp>
    </MessagesProvider>
  )
}
