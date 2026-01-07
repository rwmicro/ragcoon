import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import path from 'path'
import fs from 'fs'

let dbInitialized = false

/**
 * Initialize database schema if it doesn't exist
 */
async function initializeSchema(db: Database): Promise<void> {
  if (dbInitialized) return

  try {
    // Check if tables exist
    const tables = await db.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='chats'"
    )

    if (tables.length > 0) {
      dbInitialized = true
      return
    }

    console.log('Initializing database schema...')

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
        updated_at TEXT NOT NULL
      )
    `)

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

    // Create indexes for better performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
      CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(message_group_id);
    `)

    // Create composite indexes for common query patterns
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats(user_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_role_chat ON messages(role, chat_id);
    `)

    console.log('✓ Database schema initialized successfully')
    dbInitialized = true
  } catch (error) {
    console.error('Error initializing database schema:', error)
    throw error
  }
}

/**
 * Opens SQLite database with performance optimizations
 * Applied PRAGMAs:
 * - WAL mode for better concurrency
 * - 64MB cache for faster queries
 * - Memory-mapped I/O for large databases
 * - Temp tables in memory
 *
 * Automatically initializes schema on first connection
 */
export async function getDb(): Promise<Database> {
  const dbPath = path.join(process.cwd(), 'data', 'ragcoon.db')

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  })

  // Apply performance optimizations
  await db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = -64000;
    PRAGMA temp_store = MEMORY;
    PRAGMA mmap_size = 30000000000;
    PRAGMA wal_autocheckpoint = 1000;
    PRAGMA auto_vacuum = INCREMENTAL;
  `)

  // Initialize schema if needed
  await initializeSchema(db)

  return db
}

/**
 * Perform incremental vacuum to reclaim unused space
 * Call this periodically (e.g., once per day) to optimize database size
 */
export async function vacuumDb(): Promise<void> {
  const db = await getDb()
  try {
    await db.exec('PRAGMA incremental_vacuum;')
    console.log('✓ Database vacuum completed')
  } catch (error) {
    console.error('Error during vacuum:', error)
  } finally {
    await db.close()
  }
}

/**
 * Get database statistics
 */
export async function getDbStats(): Promise<{
  pageCount: number
  pageSize: number
  sizeBytes: number
  walCheckpoint: number
}> {
  const db = await getDb()
  try {
    const pageCount = await db.get('PRAGMA page_count;')
    const pageSize = await db.get('PRAGMA page_size;')
    const walCheckpoint = await db.get('PRAGMA wal_checkpoint;')

    return {
      pageCount: pageCount?.page_count || 0,
      pageSize: pageSize?.page_size || 0,
      sizeBytes: (pageCount?.page_count || 0) * (pageSize?.page_size || 0),
      walCheckpoint: walCheckpoint?.wal_checkpoint || 0,
    }
  } finally {
    await db.close()
  }
}

