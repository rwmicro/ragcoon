// Jest setup file
// Global test configuration

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DEBUG_LOGS = 'false'
process.env.PERFORMANCE_MONITORING = 'false'
process.env.MEMORY_PROFILING = 'false'

// Mock global.gc if not available
if (!global.gc) {
  global.gc = () => {
    // Mock GC function for tests
  }
}

// Increase timeout for long-running tests
jest.setTimeout(30000)

// Global error handler
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection in test:', error)
})
