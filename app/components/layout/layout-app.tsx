"use client"

import { Header } from "@/app/components/layout/header"
import { AppSidebar } from "@/app/components/layout/sidebar/app-sidebar"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { useEffect, useState } from "react"

export function LayoutApp({ children }: { children: React.ReactNode }) {
  const { preferences } = useUserPreferences()
  const showSidebar = preferences.navigationPosition === "sidebar"
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatches by not rendering until mounted
  if (!mounted) {
    return (
      <div className="bg-background flex w-full h-screen overflow-hidden">
        <main className="@container relative w-0 flex-shrink flex-grow overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-background flex w-full h-screen overflow-hidden" suppressHydrationWarning>
      {showSidebar && <AppSidebar />}
      <main className="@container relative w-0 flex-shrink flex-grow overflow-hidden">
        <Header showSidebar={showSidebar} />
        {children}
      </main>
    </div>
  )
}