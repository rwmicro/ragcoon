import type { UserProfile } from "./types"

export async function getSupabaseUser() {
  // Supabase is disabled in SQLite-only mode
  return { supabase: null, user: null }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  // Return null for guests to let ChatsProvider generate dynamic guest ID
  // Supabase is disabled in SQLite-only mode
  return null
}
