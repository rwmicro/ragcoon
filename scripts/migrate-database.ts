#!/usr/bin/env ts-node

/**
 * Script to migrate the SQLite database schema
 * Adds missing columns to existing tables
 *
 * Usage: npm run migrate-db
 */

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import fs from 'fs'

async function migrateDatabase() {
  const dbPath = path.join(process.cwd(), 'data', 'ragcoon.db')

  console.log('🔄 Database Migration Script')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Database path: ${dbPath}`)
  console.log('')

  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found! Run init-db first.')
    process.exit(1)
  }

  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })

    // Apply performance optimizations
    console.log('⚡ Applying performance optimizations...')
    await db.exec(`
      PRAGMA journal_mode = WAL;        -- Write-Ahead Logging for better concurrency
      PRAGMA synchronous = NORMAL;      -- Faster writes (safe with WAL)
      PRAGMA cache_size = -64000;       -- 64MB cache (negative = KB)
      PRAGMA temp_store = MEMORY;       -- Keep temp tables in memory
      PRAGMA mmap_size = 30000000000;   -- 30GB memory-mapped I/O
    `)
    console.log('✓ Performance PRAGMAs applied')
    console.log('')

    console.log('📊 Checking current schema...')

    // Get current messages table schema
    const messagesInfo = await db.all("PRAGMA table_info(messages)")
    const messageColumns = messagesInfo.map((col: any) => col.name)

    console.log('Current messages columns:', messageColumns)
    console.log('')

    // Add missing columns to messages table
    const messageColumnsToAdd = [
      { name: 'user_id', type: 'TEXT' },
      { name: 'parts', type: 'TEXT' },
      { name: 'experimental_attachments', type: 'TEXT' },
      { name: 'message_group_id', type: 'TEXT' }
    ]

    let migrationsMade = 0

    for (const column of messageColumnsToAdd) {
      if (!messageColumns.includes(column.name)) {
        console.log(`➕ Adding column '${column.name}' to messages table...`)
        await db.exec(`ALTER TABLE messages ADD COLUMN ${column.name} ${column.type}`)
        migrationsMade++
        console.log(`   ✓ Added ${column.name}`)
      } else {
        console.log(`   ✓ Column '${column.name}' already exists`)
      }
    }

    // Create index for message_group_id if it doesn't exist
    try {
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(message_group_id)`)
      console.log('   ✓ Index on message_group_id created')
    } catch (e) {
      console.log('   ℹ️  Index already exists or not needed')
    }

    // Get current chats table schema
    const chatsInfo = await db.all("PRAGMA table_info(chats)")
    const chatColumns = chatsInfo.map((col: any) => col.name)

    console.log('')
    console.log('Current chats columns:', chatColumns)
    console.log('')

    // Add missing columns to chats table
    const chatColumnsToAdd = [
      { name: 'project_id', type: 'TEXT' },
      { name: 'public', type: 'INTEGER DEFAULT 0' }
    ]

    for (const column of chatColumnsToAdd) {
      if (!chatColumns.includes(column.name)) {
        console.log(`➕ Adding column '${column.name}' to chats table...`)
        await db.exec(`ALTER TABLE chats ADD COLUMN ${column.name} ${column.type}`)
        migrationsMade++
        console.log(`   ✓ Added ${column.name}`)
      } else {
        console.log(`   ✓ Column '${column.name}' already exists`)
      }
    }

    await db.close()

    console.log('')
    if (migrationsMade > 0) {
      console.log(`✅ Migration completed! ${migrationsMade} column(s) added.`)
    } else {
      console.log('✅ Database schema is up to date!')
    }
    console.log('   The database is ready to use.')

  } catch (error) {
    console.error('')
    console.error('❌ Error migrating database:', error)
    process.exit(1)
  }
}

migrateDatabase()
