import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { getDb } from '@/lib/db'

const VALID_ROLES = ['user', 'assistant', 'system'] as const

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, chatId, data, limit, offset } = body

    const db = await getDb()
    try {
      switch (action) {
        case 'get': {
          let query = 'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC'
          const params: any[] = [chatId]

          if (typeof limit === 'number' && limit > 0) {
            query += ' LIMIT ?'
            params.push(limit)

            if (typeof offset === 'number' && offset >= 0) {
              query += ' OFFSET ?'
              params.push(offset)
            }
          }

          const messages = await db.all(query, params)

          const formattedMessages = messages.map(msg => {
            let experimentalAttachments = undefined
            if (msg.experimental_attachments) {
              try {
                experimentalAttachments = JSON.parse(msg.experimental_attachments)
              } catch (e) {
                console.error('[SQLite] Failed to parse experimental_attachments:', e)
              }
            }

            return {
              id: msg.id ? msg.id.toString() : nanoid(),
              role: msg.role,
              content: msg.content,
              createdAt: new Date(msg.created_at),
              experimental_attachments: experimentalAttachments,
            }
          })

          return NextResponse.json({ success: true, data: formattedMessages })
        }

        case 'create': {
          if (!VALID_ROLES.includes(data.role)) {
            return NextResponse.json(
              { success: false, error: `Invalid role: ${data.role}` },
              { status: 400 }
            )
          }

          const messageId = data.id || nanoid()
          await db.run(
            `INSERT OR IGNORE INTO messages (id, chat_id, content, role, user_id, model, parts, experimental_attachments, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              messageId,
              chatId,
              data.content,
              data.role,
              'local-user',
              data.model || null,
              data.parts ? JSON.stringify(data.parts) : null,
              data.experimental_attachments ? JSON.stringify(data.experimental_attachments) : null,
              data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()
            ]
          )
          return NextResponse.json({ success: true, data: { id: messageId } })
        }

        case 'createMany': {
          await db.exec('BEGIN TRANSACTION')
          const stmt = await db.prepare(
            `INSERT OR IGNORE INTO messages (id, chat_id, content, role, user_id, model, parts, experimental_attachments, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          try {
            for (const message of data) {
              const messageId = message.id || nanoid()
              await stmt.run(
                messageId,
                chatId,
                message.content,
                message.role,
                'local-user',
                message.model || null,
                message.parts ? JSON.stringify(message.parts) : null,
                message.experimental_attachments ? JSON.stringify(message.experimental_attachments) : null,
                message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString()
              )
            }
            await stmt.finalize()
            await db.exec('COMMIT')
          } catch (txError) {
            await stmt.finalize().catch(() => {})
            await db.exec('ROLLBACK')
            throw txError
          }
          return NextResponse.json({ success: true })
        }

        case 'deleteAll': {
          await db.run('DELETE FROM messages WHERE chat_id = ?', [chatId])
          return NextResponse.json({ success: true })
        }

        case 'count': {
          const result = await db.get(
            'SELECT COUNT(*) as count FROM messages WHERE chat_id = ?',
            [chatId]
          )
          return NextResponse.json({ success: true, data: { count: result?.count || 0 } })
        }

        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
          )
      }
    } finally {
      await db.close()
    }
  } catch (error) {
    console.error('SQLite messages API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
