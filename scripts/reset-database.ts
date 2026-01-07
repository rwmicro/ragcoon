#!/usr/bin/env ts-node

/**
 * Script to reset the SQLite database
 * This will delete all chats, messages, and users
 *
 * Usage: npm run reset-db
 */

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import fs from 'fs'

async function resetDatabase() {
  const dbPath = path.join(process.cwd(), 'data', 'ragcoon.db')

  console.log('🗄️  Reset Database Script')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Database path: ${dbPath}`)
  console.log('')

  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found!')
    process.exit(1)
  }

  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })

    console.log('📊 Current database stats:')

    // Get counts before deletion
    const chatCount = await db.get('SELECT COUNT(*) as count FROM chats')
    const messageCount = await db.get('SELECT COUNT(*) as count FROM messages')
    const userCount = await db.get('SELECT COUNT(*) as count FROM users')

    console.log(`   - Chats: ${chatCount?.count || 0}`)
    console.log(`   - Messages: ${messageCount?.count || 0}`)
    console.log(`   - Users: ${userCount?.count || 0}`)
    console.log('')

    // Ask for confirmation
    console.log('⚠️  WARNING: This will DELETE ALL data from the database!')
    console.log('   This action CANNOT be undone.')
    console.log('')

    // In non-interactive mode, require explicit confirmation via env var
    if (process.env.CONFIRM_RESET !== 'yes') {
      console.log('❌ Reset cancelled.')
      console.log('   To confirm, run: CONFIRM_RESET=yes npm run reset-db')
      await db.close()
      process.exit(0)
    }

    console.log('🗑️  Deleting all data...')

    // Delete in correct order (respecting foreign keys)
    await db.run('DELETE FROM messages')
    console.log('   ✓ Messages deleted')

    await db.run('DELETE FROM chats')
    console.log('   ✓ Chats deleted')

    await db.run('DELETE FROM users')
    console.log('   ✓ Users deleted')

    // Reset auto-increment counters
    await db.run('DELETE FROM sqlite_sequence')
    console.log('   ✓ Auto-increment counters reset')

    await db.close()

    console.log('')
    console.log('✅ Database reset successfully!')
    console.log('   The database is now empty and ready for fresh data.')

  } catch (error) {
    console.error('')
    console.error('❌ Error resetting database:', error)
    process.exit(1)
  }
}

resetDatabase()
