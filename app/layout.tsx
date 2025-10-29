import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TanstackQueryProvider } from "@/lib/tanstack-query/tanstack-query-provider"
import { getUserProfile } from "@/lib/user/api"
import { ThemeProvider } from "next-themes"
import Script from "next/script"
import { LayoutClient } from "./layout-client"
import { OptimizedProviders } from "./components/optimized-providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Optimize font loading
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Optimize font loading
})

export const metadata: Metadata = {
  title: "RagCoon",
  description:
    "RagCoon is the open-source interface for AI chat. Multi-model, BYOK-ready, and fully self-hostable. Use Claude, OpenAI, Gemini, local models, and more, all in one place.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isDev = process.env.NODE_ENV === "development"
  const isOfficialDeployment = process.env.RAGCOON_OFFICIAL === "true"
  const userProfile = await getUserProfile()

  return (
    <html lang="en" suppressHydrationWarning>
      {isOfficialDeployment ? (
        <Script
          defer
          src="https://assets.onedollarstats.com/stonks.js"
          {...(isDev ? { "data-debug": "ragcoon.chat" } : {})}
        />
      ) : null}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TanstackQueryProvider>
          <LayoutClient />
          <OptimizedProviders userProfile={userProfile}>
            <TooltipProvider
              delayDuration={200}
              skipDelayDuration={500}
            >
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem
                disableTransitionOnChange
              >
                <SidebarProvider defaultOpen>
                  <Toaster position="top-center" richColors />
                  {children}
                </SidebarProvider>
              </ThemeProvider>
            </TooltipProvider>
          </OptimizedProviders>
        </TanstackQueryProvider>
      </body>
    </html>
  )
}
