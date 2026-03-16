import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, userId, id, data } = body

    const db = await getDb()

    switch (action) {
      case 'get': {
        const chats = await db.all(
          'SELECT * FROM chats ORDER BY created_at DESC'
        )
        return NextResponse.json({ success: true, data: chats })
      }

      case 'create': {
        if (!data || typeof data.title !== 'string') {
          return NextResponse.json({ success: false, error: 'Missing required field: title' }, { status: 400 })
        }
        const chatId = crypto.randomUUID()
        await db.run(
          `INSERT INTO chats (id, user_id, title, model, system_prompt, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            chatId,
            'local-user',
            data.title,
            data.model,
            data.system_prompt || null,
            data.created_at || new Date().toISOString(),
            new Date().toISOString(),
          ]
        )
        return NextResponse.json({ success: true, data: { id: chatId } })
      }

      case 'update': {
        if (!id || !data || typeof data.title !== 'string') {
          return NextResponse.json({ success: false, error: 'Missing required fields: id or title' }, { status: 400 })
        }
        await db.run(
          'UPDATE chats SET title = ?, updated_at = ? WHERE id = ?',
          [data.title, new Date().toISOString(), id]
        )
        return NextResponse.json({ success: true })
      }

      case 'delete': {
        if (!id) {
          return NextResponse.json({ success: false, error: 'Missing required field: id' }, { status: 400 })
        }
        await db.run('DELETE FROM chats WHERE id = ?', [id])
        return NextResponse.json({ success: true })
      }

      default:
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
