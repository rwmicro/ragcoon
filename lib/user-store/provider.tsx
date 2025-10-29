"use client"

import type { UserProfile } from "@/lib/user/types"
import { createContext, useContext } from "react"

type UserContextType = {
  user: UserProfile | null
  isLoading: boolean
  updateUser: (updates: Partial<UserProfile>) => Promise<void>
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({
  children,
}: {
  children: React.ReactNode
  initialUser?: UserProfile | null
}) {
  const value: UserContextType = {
    user: null,
    isLoading: false,
    updateUser: async () => {},
    refreshUser: async () => {},
    signOut: async () => {},
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

// Custom hook to use the user context
export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
