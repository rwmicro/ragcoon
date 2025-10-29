"use client"

import { ChatsProvider } from "@/lib/chat-store/chats/provider"
import { ChatSessionProvider } from "@/lib/chat-store/session/provider"
import { ModelProvider } from "@/lib/model-store/provider"
import { UserPreferencesProvider } from "@/lib/user-preference-store/provider"
import { UserProvider } from "@/lib/user-store/provider"
import { memo, Suspense, useEffect, useState } from "react"

/**
 * Optimized Provider Wrapper
 * Loads providers with internal optimizations (memoization, cache-first)
 * All providers are present immediately, but load their data progressively
 */

// Loading fallback component
function ProviderLoadingFallback() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'white',
      zIndex: 9999
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: '#666', fontSize: '14px' }}>Chargement...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
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
      </UserProvider>
    </Suspense>
  )
}
