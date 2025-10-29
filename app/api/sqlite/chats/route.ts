import { NextRequest, NextResponse } from 'next/server'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'

// Initialize SQLite database
async function getDb() {
  const dbPath = path.join(process.cwd(), 'data', 'ragcoon.db')

  return open({
    filename: dbPath,
    driver: sqlite3.Database
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, userId, id, data } = body

    const db = await getDb()

    switch (action) {
      case 'get': {
        // Fetch all chats for a user
        const chats = await db.all(
          'SELECT * FROM chats WHERE user_id = ? ORDER BY created_at DESC',
          [userId]
        )
        await db.close()
        return NextResponse.json({ success: true, data: chats })
      }

      case 'create': {
        // Create a new chat
        const chatId = crypto.randomUUID()
        await db.run(
          `INSERT INTO chats (id, user_id, title, model, system_prompt, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            chatId,
            data.user_id,
            data.title,
            data.model,
            data.system_prompt || null,
            data.created_at || new Date().toISOString(),
            new Date().toISOString()
          ]
        )
        await db.close()
        return NextResponse.json({ success: true, data: { id: chatId } })
      }

      case 'update': {
        // Update chat (typically title)
        await db.run(
          'UPDATE chats SET title = ?, updated_at = ? WHERE id = ?',
          [data.title, new Date().toISOString(), id]
        )
        await db.close()
        return NextResponse.json({ success: true })
      }

      case 'delete': {
        // Delete a chat
        await db.run('DELETE FROM chats WHERE id = ?', [id])
        await db.close()
        return NextResponse.json({ success: true })
      }

      default:
        await db.close()
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('SQLite chats API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
