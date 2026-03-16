import { toast } from "@/components/ui/toast"
import { sanitizeFileName } from "./sanitize"

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export type Attachment = {
  name: string
  contentType: string
  url: string
}

export async function validateFile(
  file: File
): Promise<{ isValid: boolean; error?: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    }
  }

  if (file.size === 0) {
    return { isValid: false, error: "File is empty" }
  }

  return { isValid: true }
}

export async function uploadFileToLocal(
  file: File
): Promise<string> {
  // Always use data URLs — the AI SDK doesn't support blob: URLs in attachments
  return await fileToDataURL(file)
}

// AI SDK only supports image/*, application/pdf, and text/plain in user messages.
// Normalize all text/code MIME types to text/plain.
function normalizeContentType(mimeType: string): string {
  if (mimeType.startsWith("image/") || mimeType === "application/pdf") {
    return mimeType
  }
  return "text/plain"
}

export function createAttachment(file: File, url: string): Attachment {
  return {
    name: sanitizeFileName(file.name),
    contentType: normalizeContentType(file.type),
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
