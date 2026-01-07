import createDOMPurify from "dompurify"

// Initialize DOMPurify differently for server vs client
let DOMPurify: ReturnType<typeof createDOMPurify>

if (typeof window === 'undefined') {
  // Server-side: use JSDOM
  const { JSDOM } = require("jsdom")
  const jsdomWindow = new JSDOM("").window
  DOMPurify = createDOMPurify(jsdomWindow as any)
} else {
  // Client-side: use native window
  DOMPurify = createDOMPurify(window)
}

// Strict configuration for user input
const STRICT_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
  ALLOWED_ATTR: ['href', 'title', 'target'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  SAFE_FOR_TEMPLATES: true,
  RETURN_TRUSTED_TYPE: false,
}

// Very strict configuration for RAG content
const RAG_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'code', 'pre'],
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  SAFE_FOR_TEMPLATES: true,
  KEEP_CONTENT: true, // Preserve text content even if tags are stripped
}

export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // Limit input length to prevent DoS
  const MAX_LENGTH = 100000
  if (input.length > MAX_LENGTH) {
    console.warn(`Input truncated from ${input.length} to ${MAX_LENGTH} characters`)
    input = input.substring(0, MAX_LENGTH)
  }

  return DOMPurify.sanitize(input, STRICT_CONFIG)
}

export function sanitizeRagContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return ''
  }

  // More lenient length for RAG content but still limited
  const MAX_LENGTH = 500000
  if (content.length > MAX_LENGTH) {
    console.warn(`RAG content truncated from ${content.length} to ${MAX_LENGTH} characters`)
    content = content.substring(0, MAX_LENGTH)
  }

  return DOMPurify.sanitize(content, RAG_CONFIG)
}

export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return 'unnamed_file'
  }

  // Remove any path traversal attempts
  return fileName
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255) // Max filename length
}
