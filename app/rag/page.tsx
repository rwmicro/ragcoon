"use client"

import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { RAGDashboardComplete } from "@/app/components/rag/rag-dashboard-complete"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { checkHealth } from "@/lib/api/rag"
import { useEffect, useState } from "react"
import { WarningCircle, ArrowClockwise } from "@phosphor-icons/react"

export default function RAGDashboard() {
  const { preferences } = useUserPreferences()
  const showSidebar = preferences.navigationPosition === "sidebar"

  const [backendStatus, setBackendStatus] = useState<"checking" | "available" | "unavailable">("checking")

  useEffect(() => {
    checkHealth().then((result) => {
      if (result.status === "unhealthy") {
        setBackendStatus("unavailable")
      } else {
        setBackendStatus("available")
      }
    })
  }, [])

  return (
    <MessagesProvider>
      <LayoutApp>
        <div className={`container mx-auto px-4 max-w-7xl h-full w-full overflow-y-auto ${showSidebar ? 'pt-6 pb-8' : 'pt-20 pb-8'}`}>
          {backendStatus === "checking" && (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <ArrowClockwise size={16} className="animate-spin" />
                Checking backend availability…
              </div>
            </div>
          )}

          {backendStatus === "unavailable" && (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center">
                <WarningCircle size={48} className="text-destructive opacity-80" />
                <div>
                  <p className="text-foreground text-lg font-medium">Backend unavailable</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    The RAG backend could not be reached. Make sure it is running on{" "}
                    <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
                      {process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8001"}
                    </code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBackendStatus("checking")
                    checkHealth().then((result) => {
                      setBackendStatus(result.status === "unhealthy" ? "unavailable" : "available")
                    })
                  }}
                  className="hover:bg-accent text-foreground inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors"
                >
                  <ArrowClockwise size={14} />
                  Retry
                </button>
              </div>
            </div>
          )}

          {backendStatus === "available" && <RAGDashboardComplete />}
        </div>
      </LayoutApp>
    </MessagesProvider>
  )
}
