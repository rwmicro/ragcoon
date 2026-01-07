import { toast } from "@/components/ui/toast"
import * as fileType from "file-type"
import { sanitizeFileName } from "./sanitize"

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB (increased for video support)

// Blocked file types for security reasons
const BLOCKED_FILE_TYPES = [
  "image/svg+xml", // SVG can contain JavaScript
  "text/html",
  "application/x-httpd-php",
  "application/x-sh",
  "application/x-executable",
]

const ALLOWED_FILE_TYPES = [
  // Images (SVG removed for security)
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo", // .avi
  "video/x-ms-wmv", // .wmv
  "video/3gpp", // .3gp
  "video/x-flv", // .flv
  "video/x-matroska", // .mkv
  // Documents
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

// Dangerous extensions that should never be allowed
const BLOCKED_EXTENSIONS = [
  'exe', 'dll', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'jar',
  'app', 'deb', 'rpm', 'dmg', 'pkg', 'run', 'bin',
  'html', 'htm', 'svg', 'xml', 'xhtml', 'php', 'jsp', 'asp'
]

export type Attachment = {
  name: string
  contentType: string
  url: string
}

export async function validateFile(
  file: File
): Promise<{ isValid: boolean; error?: string }> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    }
  }

  // Check for empty files
  if (file.size === 0) {
    return {
      isValid: false,
      error: "File is empty",
    }
  }

  // Sanitize and validate file name
  const sanitizedName = sanitizeFileName(file.name)
  const extension = sanitizedName.split('.').pop()?.toLowerCase()

  // Check blocked extensions
  if (extension && BLOCKED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `File extension .${extension} is not allowed for security reasons`,
    }
  }

  // Validate file content (magic bytes)
  try {
    const buffer = await file.arrayBuffer()

    // Check the entire file header, not just first 4100 bytes
    const headerSize = Math.min(buffer.byteLength, 8192)
    const type = await fileType.fileTypeFromBuffer(
      Buffer.from(buffer.slice(0, headerSize))
    )

    // Check if detected type is blocked
    if (type && BLOCKED_FILE_TYPES.includes(type.mime)) {
      return {
        isValid: false,
        error: `File type ${type.mime} is blocked for security reasons`,
      }
    }

    // Check if detected type is in allowed list
    if (!type || !ALLOWED_FILE_TYPES.includes(type.mime)) {
      return {
        isValid: false,
        error: "File type not supported or doesn't match its extension",
      }
    }

    // Additional check: ensure declared type matches detected type
    if (file.type && type.mime !== file.type) {
      console.warn(`File type mismatch: declared=${file.type}, detected=${type.mime}`)
      // Allow some common mismatches (e.g., text files)
      const allowedMismatches = ['text/plain', 'text/markdown', 'application/json']
      if (!allowedMismatches.includes(type.mime) && !allowedMismatches.includes(file.type)) {
        return {
          isValid: false,
          error: "File type doesn't match its content",
        }
      }
    }

    return { isValid: true }
  } catch (error) {
    console.error('File validation error:', error)
    return {
      isValid: false,
      error: 'Failed to validate file',
    }
  }
}

// Track blob URLs for cleanup
const activeBlobUrls = new Set<string>()

export async function uploadFileToLocal(
  file: File
): Promise<string> {
  // For SQLite-only mode, use data URLs for images/videos
  // and blob URLs for other files (local preview only)
  if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
    return await fileToDataURL(file)
  } else {
    const blobUrl = URL.createObjectURL(file)
    activeBlobUrls.add(blobUrl)
    return blobUrl
  }
}

/**
 * Revoke a blob URL to free memory
 */
export function revokeBlobUrl(url: string) {
  if (url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url)
      activeBlobUrls.delete(url)
    } catch (error) {
      console.warn('Failed to revoke blob URL:', url, error)
    }
  }
}

/**
 * Cleanup all active blob URLs (call on unmount)
 */
export function cleanupAllBlobUrls() {
  let revokedCount = 0
  activeBlobUrls.forEach(url => {
    try {
      URL.revokeObjectURL(url)
      revokedCount++
    } catch (error) {
      console.warn('Failed to revoke blob URL:', url)
    }
  })
  activeBlobUrls.clear()
  if (revokedCount > 0) {
    console.log(`Cleaned up ${revokedCount} blob URLs`)
  }
}

export function createAttachment(file: File, url: string): Attachment {
  return {
    name: sanitizeFileName(file.name),
    contentType: file.type,
    url,
  }
}

async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function processFiles(
  files: File[],
  chatId: string,
  userId: string
): Promise<Attachment[]> {
  const attachments: Attachment[] = []

  for (const file of files) {
    const validation = await validateFile(file)
    if (!validation.isValid) {
      console.warn(`File ${file.name} validation failed:`, validation.error)
      toast({
        title: "File validation failed",
        description: validation.error,
        status: "error",
      })
      continue
    }

    try {
      // SQLite-only mode: use local file handling
      const url = await uploadFileToLocal(file)
      attachments.push(createAttachment(file, url))
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
      toast({
        title: "Error processing file",
        description: `Failed to process ${file.name}`,
        status: "error",
      })
    }
  }

  return attachments
}

export class FileUploadLimitError extends Error {
  code: string
  constructor(message: string) {
    super(message)
    this.code = "DAILY_FILE_LIMIT_REACHED"
  }
}

export async function checkFileUploadLimit(userId: string) {
  // SQLite-only mode: no upload limits enforced for local usage
  return 0
}
