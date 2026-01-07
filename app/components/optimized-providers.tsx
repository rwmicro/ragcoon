"use client"

import { ChatsProvider } from "@/lib/chat-store/chats/provider"
import { ChatSessionProvider } from "@/lib/chat-store/session/provider"
import { ModelProvider } from "@/lib/model-store/provider"
import { UserPreferencesProvider } from "@/lib/user-preference-store/provider"
import { AISettingsProvider } from "@/lib/ai-settings-store/provider"
import { RAGSettingsProvider } from "@/lib/rag-settings-store/provider"
import { UserProvider } from "@/lib/user-store/provider"
import { memo, Suspense, useEffect, useState } from "react"

/**
 * Optimized Provider Wrapper
 * Loads providers with internal optimizations (memoization, cache-first)
 * All providers are present immediately, but load their data progressively
 */

// Loading fallback component - minimal, no blocking UI
function ProviderLoadingFallback() {
  return null
}

/**
 * Optimized Providers
 * All providers are mounted immediately to avoid context errors
 * But they load their data progressively with cache-first strategy
 */
export function OptimizedProviders({
  children,
  userProfile
}: {
  children: React.ReactNode
  userProfile: any
}) {
  return (
    <Suspense fallback={<ProviderLoadingFallback />}>
      <UserProvider initialUser={userProfile}>
        <AISettingsProvider>
          <RAGSettingsProvider>
            <ModelProvider>
              <ChatsProvider userId={userProfile?.id}>
                <ChatSessionProvider>
                  <UserPreferencesProvider
                    userId={userProfile?.id}
                    initialPreferences={userProfile?.preferences}
                  >
                    {children}
                  </UserPreferencesProvider>
                </ChatSessionProvider>
              </ChatsProvider>
            </ModelProvider>
          </RAGSettingsProvider>
        </AISettingsProvider>
      </UserProvider>
    </Suspense>
  )
}
