#!/usr/bin/env ts-node

/**
 * Script to initialize the SQLite database with proper schema
 * This will create all necessary tables if they don't exist
 *
 * Usage: npm run init-db
 */

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import fs from 'fs'

async function initDatabase() {
  const dbPath = path.join(process.cwd(), 'data', 'ragcoon.db')

  console.log('🗄️  Database Initialization Script')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Database path: ${dbPath}`)
  console.log('')

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
    console.log('✓ Created data directory')
  }

  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })

    console.log('📊 Creating database schema...')
    console.log('')

    // Apply performance optimizations
    console.log('⚡ Applying performance optimizations...')
    await db.exec(`
      PRAGMA journal_mode = WAL;        -- Write-Ahead Logging for better concurrency
      PRAGMA synchronous = NORMAL;      -- Faster writes (safe with WAL)
      PRAGMA cache_size = -64000;       -- 64MB cache (negative = KB)
      PRAGMA temp_store = MEMORY;       -- Keep temp tables in memory
      PRAGMA mmap_size = 30000000000;   -- 30GB memory-mapped I/O
      PRAGMA page_size = 4096;          -- Optimal page size
      PRAGMA auto_vacuum = INCREMENTAL; -- Prevent database bloat
    `)
    console.log('✓ Performance PRAGMAs applied')
    console.log('')

    // Create users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    console.log('✓ Users table created')

    // Create chats table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        model TEXT NOT NULL,
        system_prompt TEXT,
        project_id TEXT,
        public INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    console.log('✓ Chats table created')

    // Create messages table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        user_id TEXT,
        model TEXT,
        parts TEXT,
        experimental_attachments TEXT,
        message_group_id TEXT,
        tokens_used INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
      )
    `)
    console.log('✓ Messages table created')

    // Create indexes for better performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
      CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(message_group_id);
    `)
    console.log('✓ Indexes created')

    // Get table counts
    const tables = await db.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )

    await db.close()

    console.log('')
    console.log('✅ Database initialized successfully!')
    console.log('')
    console.log(`   Tables created: ${tables.map(t => t.name).join(', ')}`)
    console.log('')
    console.log('   The database is ready to use.')

  } catch (error) {
    console.error('')
    console.error('❌ Error initializing database:', error)
    process.exit(1)
  }
}

initDatabase()
