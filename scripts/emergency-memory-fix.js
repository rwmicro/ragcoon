#!/usr/bin/env node

/**
 * Emergency Memory Fix Script
 * Use this when experiencing memory crashes
 */

const fs = require('fs')
const path = require('path')

console.log('🚨 Emergency Memory Fix for RagCoon')
console.log('==================================')

// 1. Clear Next.js cache
const nextCacheDir = path.join(process.cwd(), '.next')
if (fs.existsSync(nextCacheDir)) {
  try {
    fs.rmSync(nextCacheDir, { recursive: true, force: true })
    console.log('✅ Cleared Next.js cache (.next/)')
  } catch (error) {
    console.log('⚠️  Could not clear Next.js cache:', error.message)
  }
}

// 2. Clear node_modules/.cache if exists
const nodeCacheDir = path.join(process.cwd(), 'node_modules', '.cache')
if (fs.existsSync(nodeCacheDir)) {
  try {
    fs.rmSync(nodeCacheDir, { recursive: true, force: true })
    console.log('✅ Cleared node_modules cache')
  } catch (error) {
    console.log('⚠️  Could not clear node_modules cache:', error.message)
  }
}

// 3. Reset SQLite database to minimal state
const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'ragcoon.db')
const dbFiles = [dbPath, dbPath + '-wal', dbPath + '-shm']

console.log('\n📁 Database cleanup:')
dbFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      fs.unlinkSync(file)
      console.log(`✅ Removed ${path.basename(file)}`)
    } catch (error) {
      console.log(`⚠️  Could not remove ${path.basename(file)}:`, error.message)
    }
  }
})

// 4. Create optimized environment file
const envPath = path.join(process.cwd(), '.env.local')
const optimizedEnv = `# Emergency memory optimization
NODE_OPTIONS="--max-old-space-size=6144 --expose-gc"
SKIP_MIGRATIONS=false
SQLITE_WAL_MODE=false
SQLITE_TIMEOUT=30000

# Disable unnecessary features for initial startup
NEXT_TELEMETRY_DISABLED=1
ANALYZE=false
`

try {
  fs.writeFileSync(envPath, optimizedEnv)
  console.log('✅ Created optimized .env.local')
} catch (error) {
  console.log('⚠️  Could not create .env.local:', error.message)
}

console.log('\n🎯 Recommendations:')
console.log('1. Restart your application: npm run dev')
console.log('2. If still crashing, increase memory: export NODE_OPTIONS="--max-old-space-size=8192 --expose-gc"')
console.log('3. Consider running in production mode: npm run build && npm start')
console.log('4. Monitor memory with: npm run db:health')

console.log('\n⚡ Emergency fix completed!')