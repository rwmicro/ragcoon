#!/usr/bin/env node

/**
 * Fast development startup - no heavy checks
 */

const { spawn } = require('child_process')

console.log('🚀 Starting development server with optimizations...')

const child = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: '--max-old-space-size=7168 --expose-gc --max-semi-space-size=128'
  }
})

child.on('exit', (code) => {
  process.exit(code)
})

process.on('SIGINT', () => {
  child.kill('SIGINT')
})

process.on('SIGTERM', () => {
  child.kill('SIGTERM')
})
