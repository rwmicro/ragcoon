import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, userId, id, data } = body

    const db = await getDb()

    switch (action) {
      case 'get': {
        // Fetch all chats (single user mode)
        const chats = await db.all(
          'SELECT * FROM chats ORDER BY created_at DESC'
        )
        await db.close()
        return NextResponse.json({ success: true, data: chats })
      }

      case 'create': {
        // Create a new chat (single user mode - default user_id)
        const chatId = crypto.randomUUID()
        await db.run(
          `INSERT INTO chats (id, user_id, title, model, system_prompt, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            chatId,
            'local-user', // Fixed user_id for single user mode
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
