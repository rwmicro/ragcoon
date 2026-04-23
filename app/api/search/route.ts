import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "nodejs"

export type SearchHit = {
  chatId: string
  chatTitle: string
  matchType: "title" | "message"
  snippet: string
  messageId?: string
  role?: "user" | "assistant" | "system"
  createdAt: string
}

function escapeLike(input: string): string {
  // Escape LIKE wildcards so user input is treated literally
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

function buildSnippet(content: string, query: string, radius = 80): string {
  const lower = content.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return content.slice(0, radius * 2)
  const start = Math.max(0, idx - radius)
  const end = Math.min(content.length, idx + query.length + radius)
  const prefix = start > 0 ? "…" : ""
  const suffix = end < content.length ? "…" : ""
  return prefix + content.slice(start, end) + suffix
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = (searchParams.get("q") ?? "").trim()
  const limitParam = Number(searchParams.get("limit") ?? "20")
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.floor(limitParam), 1), 100)
    : 20

  if (query.length < 2) {
    return NextResponse.json({ hits: [] })
  }

  const db = await getDb()
  const likeQuery = `%${escapeLike(query)}%`

  const titleRows = await db.all<
    Array<{ id: string; title: string; updated_at: string }>
  >(
    `SELECT id, title, updated_at
     FROM chats
     WHERE title LIKE ? ESCAPE '\\'
     ORDER BY updated_at DESC
     LIMIT ?`,
    [likeQuery, limit]
  )

  const messageRows = await db.all<
    Array<{
      id: string
      chat_id: string
      role: "user" | "assistant" | "system"
      content: string
      created_at: string
      chat_title: string
    }>
  >(
    `SELECT m.id, m.chat_id, m.role, m.content, m.created_at, c.title AS chat_title
     FROM messages m
     INNER JOIN chats c ON c.id = m.chat_id
     WHERE m.content LIKE ? ESCAPE '\\'
     ORDER BY m.created_at DESC
     LIMIT ?`,
    [likeQuery, limit]
  )

  const hits: SearchHit[] = [
    ...titleRows.map((row) => ({
      chatId: row.id,
      chatTitle: row.title,
      matchType: "title" as const,
      snippet: row.title,
      createdAt: row.updated_at,
    })),
    ...messageRows.map((row) => ({
      chatId: row.chat_id,
      chatTitle: row.chat_title,
      matchType: "message" as const,
      snippet: buildSnippet(row.content, query),
      messageId: row.id,
      role: row.role,
      createdAt: row.created_at,
    })),
  ]

  // Dedupe so a chat's title match doesn't duplicate with its message match
  const seen = new Set<string>()
  const deduped: SearchHit[] = []
  for (const hit of hits) {
    const key = `${hit.chatId}:${hit.matchType}:${hit.messageId ?? ""}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(hit)
    if (deduped.length >= limit) break
  }

  return NextResponse.json({ hits: deduped })
}
