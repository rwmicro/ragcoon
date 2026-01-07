/**
 * Rate limiter using sliding window algorithm
 * Stores requests in memory with automatic cleanup
 */

interface RateLimitEntry {
  count: number
  resetTime: number
  requests: number[]
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Check if a request should be allowed
   * @param identifier - Unique identifier (IP address, user ID, etc.)
   * @param maxRequests - Maximum number of requests allowed in the window
   * @param windowMs - Time window in milliseconds
   * @returns Object with allowed status and retry information
   */
  check(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const entry = this.requests.get(identifier)

    if (!entry) {
      // First request from this identifier
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
        requests: [now]
      })
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      }
    }

    // Remove requests outside the current window
    entry.requests = entry.requests.filter(time => now - time < windowMs)
    entry.count = entry.requests.length

    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      const oldestRequest = entry.requests[0]
      const resetTime = oldestRequest + windowMs

      return {
        allowed: false,
        remaining: 0,
        resetTime
      }
    }

    // Allow the request
    entry.requests.push(now)
    entry.count = entry.requests.length
    entry.resetTime = now + windowMs

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup() {
    const now = Date.now()
    let cleaned = 0

    for (const [identifier, entry] of this.requests.entries()) {
      // Remove entries that haven't been accessed in the last hour
      if (entry.resetTime < now - 60 * 60 * 1000) {
        this.requests.delete(identifier)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`[Rate Limiter] Cleaned up ${cleaned} old entries`)
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string) {
    this.requests.delete(identifier)
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      totalIdentifiers: this.requests.size,
      entries: Array.from(this.requests.entries()).map(([id, entry]) => ({
        identifier: id,
        count: entry.count,
        resetTime: new Date(entry.resetTime).toISOString()
      }))
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.requests.clear()
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

// Rate limit configurations
export const RATE_LIMITS = {
  // Chat endpoints
  CHAT: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 requests per minute
  },
  // File upload
  FILE_UPLOAD: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 files per minute
  },
  // RAG document processing
  RAG_PROCESS: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 documents per minute
  },
  // General API
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests per minute
  },
}

/**
 * Helper to get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (for local use)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  // Fallback to a fixed identifier for local use
  return 'localhost'
}

/**
 * Middleware helper for rate limiting
 */
export function createRateLimitResponse(resetTime: number) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter: retryAfter,
      resetTime: new Date(resetTime).toISOString()
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString()
      }
    }
  )
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => rateLimiter.destroy())
  process.on('SIGINT', () => {
    rateLimiter.destroy()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    rateLimiter.destroy()
    process.exit(0)
  })
}
