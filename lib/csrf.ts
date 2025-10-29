import { createHash, randomBytes, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

// Validate CSRF_SECRET at startup
const CSRF_SECRET = process.env.CSRF_SECRET
if (!CSRF_SECRET) {
  throw new Error('CSRF_SECRET environment variable is required')
}
if (CSRF_SECRET.length < 32) {
  throw new Error('CSRF_SECRET must be at least 32 characters long')
}

// Token expiration time (15 minutes)
const TOKEN_EXPIRATION_MS = 15 * 60 * 1000

export function generateCsrfToken(): string {
  const raw = randomBytes(32).toString("hex")
  const timestamp = Date.now().toString()
  const token = createHash("sha256")
    .update(`${raw}${timestamp}${CSRF_SECRET}`)
    .digest("hex")
  return `${raw}:${timestamp}:${token}`
}

export function validateCsrfToken(fullToken: string): boolean {
  try {
    const parts = fullToken.split(":")
    if (parts.length !== 3) return false

    const [raw, timestamp, token] = parts
    if (!raw || !timestamp || !token) return false

    // Validate timestamp format
    const tokenTime = parseInt(timestamp, 10)
    if (isNaN(tokenTime)) return false

    // Check token expiration
    const now = Date.now()
    if (now - tokenTime > TOKEN_EXPIRATION_MS) {
      console.warn('CSRF token expired')
      return false
    }

    // Validate token hash with timing-safe comparison
    const expected = createHash("sha256")
      .update(`${raw}${timestamp}${CSRF_SECRET}`)
      .digest("hex")

    // Use timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expected, 'hex')
    const tokenBuffer = Buffer.from(token, 'hex')

    if (expectedBuffer.length !== tokenBuffer.length) return false

    return timingSafeEqual(expectedBuffer, tokenBuffer)
  } catch (error) {
    console.error('CSRF token validation error:', error)
    return false
  }
}

export async function setCsrfCookie() {
  const cookieStore = await cookies()
  const token = generateCsrfToken()
  cookieStore.set("csrf_token", token, {
    httpOnly: false, // Must be false for client-side reading
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: "/",
    maxAge: TOKEN_EXPIRATION_MS / 1000, // Convert to seconds
  })
}
