"use client"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { X, Play } from "@phosphor-icons/react"
import Image from "next/image"
import { useState } from "react"

type FileItemProps = {
  file: File
  onRemove: (file: File) => void
}

export function FileItem({ file, onRemove }: FileItemProps) {
  const [isRemoving, setIsRemoving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleRemove = () => {
    setIsRemoving(true)
    onRemove(file)
  }

  const isImage = file.type.startsWith("image/")
  const isVideo = file.type.startsWith("video/")
  const fileUrl = URL.createObjectURL(file)
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div className="relative mr-2 mb-0 flex items-center">
      <HoverCard
        open={(isImage || isVideo) ? isOpen : false}
        onOpenChange={setIsOpen}
      >
        <HoverCardTrigger className="w-full">
          <div className="bg-background hover:bg-accent border-input flex w-full items-center gap-3 rounded-2xl border p-2 pr-3 transition-colors">
            <div className="bg-accent-foreground flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md relative">
              {isImage ? (
                <Image
                  src={fileUrl}
                  alt={file.name}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : isVideo ? (
                <>
                  <video
                    src={fileUrl}
                    className="h-full w-full object-cover"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="size-4 text-white" weight="fill" />
                  </div>
                </>
              ) : (
                <div className="text-center text-xs text-gray-400">
                  {file.name.split(".").pop()?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-xs font-medium">{file.name}</span>
              <span className="text-xs text-gray-500">
                {formatFileSize(file.size)}
              </span>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent side="top" className="p-2">
          {isImage ? (
            <Image
              src={fileUrl}
              alt={file.name}
              width={300}
              height={200}
              className="max-h-48 w-auto object-contain rounded"
            />
          ) : isVideo ? (
            <video
              src={fileUrl}
              controls
              className="max-h-48 w-auto rounded"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          ) : null}
        </HoverCardContent>
      </HoverCard>
      {!isRemoving ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleRemove}
              className="border-background absolute top-1 right-1 z-10 inline-flex size-6 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] bg-black text-white shadow-none transition-colors"
              aria-label="Remove file"
            >
              <X className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Remove file</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}
