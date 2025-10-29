import { NextResponse, type NextRequest } from "next/server"
import { validateCsrfToken } from "./lib/csrf"

export async function middleware(request: NextRequest) {
  // Create basic response
  const response = NextResponse.next()

  // CSRF protection for state-changing requests
  if (["POST", "PUT", "DELETE"].includes(request.method)) {
    const csrfCookie = request.cookies.get("csrf_token")?.value
    const headerToken = request.headers.get("x-csrf-token")

    if (!csrfCookie || !headerToken || !validateCsrfToken(headerToken)) {
      return new NextResponse("Invalid CSRF token", { status: 403 })
    }
  }

  // Strict CSP with nonces for inline scripts (removed unsafe-inline/unsafe-eval)
  const isDev = process.env.NODE_ENV === "development"

  // Generate a nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Store nonce in response headers for Next.js to use
  response.headers.set('x-nonce', nonce)

  // Strict Content Security Policy
  const cspDirectives = [
    `default-src 'self'`,
    // unsafe-eval needed for Next.js development and some production features
    isDev
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://cdnjs.cloudflare.com`
      : `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://cdnjs.cloudflare.com`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`, // unsafe-inline for styled components
    `img-src 'self' data: https: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' ws: wss: http://localhost:* https://localhost:*`, // Local Ollama
    `frame-src 'self'`,
    `media-src 'self' blob: data:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ]

  // Remove upgrade-insecure-requests in dev for localhost
  if (!isDev) {
    cspDirectives.push(`upgrade-insecure-requests`)
  }

  // Add additional directives for development
  if (isDev) {
    cspDirectives.push(`worker-src 'self' blob:`)
  }

  response.headers.set("Content-Security-Policy", cspDirectives.join('; '))

  // Additional security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
  runtime: "nodejs",
}
