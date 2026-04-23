import type { Metadata } from "next"
import localFont from "next/font/local"
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
import { KeyboardShortcutsWrapper } from "./components/keyboard-shortcuts-wrapper"
import { ErrorBoundary } from "@/components/error-boundary"

const geistSans = localFont({
  src: "../public/fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  weight: "100 900",
})

const geistMono = localFont({
  src: "../public/fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
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
      <head>
        {/* Preconnect to Ollama endpoint for faster API calls */}
        <link rel="preconnect" href="http://localhost:11434" />
        <link rel="dns-prefetch" href="http://localhost:11434" />
      </head>
      {isOfficialDeployment ? (
        <Script
          defer
          src="https://assets.onedollarstats.com/stonks.js"
          {...(isDev ? { "data-debug": "ragcoon.chat" } : {})}
        />
      ) : null}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
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
                <SidebarProvider defaultOpen={true}>
                  <Toaster position="top-center" richColors />
                  <KeyboardShortcutsWrapper />
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </SidebarProvider>
              </ThemeProvider>
            </TooltipProvider>
          </OptimizedProviders>
        </TanstackQueryProvider>
      </body>
    </html>
  )
}
