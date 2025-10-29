#!/usr/bin/env node

/**
 * Memory-safe startup script for RagCoon
 * Prevents startup if memory conditions are dangerous
 */

const { spawn } = require('child_process')

function getMemoryUsage() {
  const usage = process.memoryUsage()
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024)
  }
}

function checkSystemMemory() {
  try {
    const { execSync } = require('child_process')
    const output = execSync('free -m', { encoding: 'utf8' })
    const lines = output.split('\n')
    const memLine = lines[1] // Second line contains memory info
    const values = memLine.split(/\s+/)
    const total = parseInt(values[1])
    const used = parseInt(values[2])
    const available = parseInt(values[6])

    return {
      total,
      used,
      available,
      usedPercent: Math.round((used / total) * 100)
    }
  } catch (error) {
    console.warn('Could not check system memory:', error.message)
    return null
  }
}

function main() {
  console.log('🔍 Memory-safe startup check...')

  const nodeMemory = getMemoryUsage()
  const systemMemory = checkSystemMemory()

  console.log(`Node.js memory: ${nodeMemory.heapUsed}MB heap, ${nodeMemory.rss}MB RSS`)

  if (systemMemory) {
    console.log(`System memory: ${systemMemory.used}MB used / ${systemMemory.total}MB total (${systemMemory.usedPercent}%)`)

    // Check if system memory is critically high
    if (systemMemory.usedPercent > 90) {
      console.error('❌ System memory usage too high (>90%). Aborting startup to prevent crash.')
      console.error('Try: npm run emergency:fix')
      process.exit(1)
    }

    if (systemMemory.available < 1000) {
      console.error('❌ Less than 1GB available memory. Aborting startup.')
      console.error('Try: npm run emergency:fix')
      process.exit(1)
    }
  }

  // Check Node.js heap usage
  if (nodeMemory.heapUsed > 2000) {
    console.error(`❌ Node.js heap usage too high (${nodeMemory.heapUsed}MB). Aborting startup.`)
    console.error('Try: npm run emergency:fix')
    process.exit(1)
  }

  console.log('✅ Memory check passed. Starting application...')

  // Start the application with memory monitoring
  const args = process.argv.slice(2)
  const nodeOptions = process.env.NODE_OPTIONS || ''

  // Ensure memory limits are set - reasonable limits for development
  const safeNodeOptions = `--max-old-space-size=4096 --expose-gc`.trim()

  const child = spawn('npx', ['next', 'dev'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: safeNodeOptions
    }
  })

  child.on('exit', (code) => {
    if (code === 134) {
      console.error('\n💥 Application crashed with out-of-memory error!')
      console.error('Recommendations:')
      console.error('1. Run: npm run emergency:fix')
      console.error('2. Check for memory leaks in your code')
      console.error('3. Reduce concurrent operations')
      console.error('4. Consider increasing swap space')
    }
    process.exit(code)
  })

  // Monitor memory periodically
  const memoryMonitor = setInterval(() => {
    const currentMemory = getMemoryUsage()
    if (currentMemory.heapUsed > 4000) {
      console.warn(`⚠️  Memory warning: ${currentMemory.heapUsed}MB heap used`)

      if (currentMemory.heapUsed > 5000) {
        console.error('🚨 Critical memory usage detected. Attempting cleanup...')
        if (global.gc) {
          global.gc()
          console.log('Forced garbage collection')
        }
      }
    }
  }, 30000) // Check every 30 seconds

  // Cleanup on exit
  process.on('SIGINT', () => {
    clearInterval(memoryMonitor)
    child.kill('SIGINT')
  })

  process.on('SIGTERM', () => {
    clearInterval(memoryMonitor)
    child.kill('SIGTERM')
  })
}

if (require.main === module) {
  main()
}