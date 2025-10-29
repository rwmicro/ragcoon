import { toast } from "@/components/ui/toast"
import {
  Attachment,
  checkFileUploadLimit,
  processFiles,
} from "@/lib/file-handling"
import { useCallback, useEffect, useRef, useState } from "react"

// Track active blob URLs to ensure cleanup
export const activeBlobUrls = new Set<string>()

export const useFileUpload = () => {
  const [files, setFiles] = useState<File[]>([])
  const mountedRef = useRef(true)

  // Cleanup all blob URLs on unmount
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      // Cleanup all tracked blob URLs
      activeBlobUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url)
        } catch (error) {
          // Silently fail if URL is already revoked
        }
      })
      activeBlobUrls.clear()
    }
  }, [])

  const handleFileUploads = async (
    uid: string,
    chatId: string
  ): Promise<Attachment[] | null> => {
    if (files.length === 0) return []

    try {
      await checkFileUploadLimit(uid)
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string }
      if (error.code === "DAILY_FILE_LIMIT_REACHED") {
        toast({ title: error.message || "Daily file limit reached", status: "error" })
        return null
      }
    }

    try {
      const processed = await processFiles(files, chatId, uid)
      setFiles([])
      return processed
    } catch {
      toast({ title: "Failed to process files", status: "error" })
      return null
    }
  }

  const createOptimisticAttachments = (files: File[]) => {
    return files.map((file) => {
      const isMediaFile = file.type.startsWith("image/") || file.type.startsWith("video/")

      if (isMediaFile) {
        const url = URL.createObjectURL(file)
        // Track the blob URL for cleanup
        activeBlobUrls.add(url)
        return {
          name: file.name,
          contentType: file.type,
          url
        }
      }

      return {
        name: file.name,
        contentType: file.type,
        url: ""
      }
    })
  }

  const cleanupOptimisticAttachments = (attachments?: Array<{ url?: string }>) => {
    if (!attachments) return

    attachments.forEach((attachment) => {
      if (attachment.url?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(attachment.url)
          activeBlobUrls.delete(attachment.url)
        } catch (error) {
          // Silently fail if URL is already revoked
        }
      }
      // Data URLs (base64) don't need cleanup as they're just strings
    })
  }

  const handleFileUpload = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const handleFileRemove = useCallback((file: File) => {
    setFiles((prev) => prev.filter((f) => f !== file))
  }, [])

  return {
    files,
    setFiles,
    handleFileUploads,
    createOptimisticAttachments,
    cleanupOptimisticAttachments,
    handleFileUpload,
    handleFileRemove,
  }
}
