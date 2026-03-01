"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"
import { useState } from "react"
import { getFavicon, formatUrl } from "./utils"

export type WebSource = {
  url: string
  title: string
}

type WebSourceBubblesProps = {
  sources: WebSource[]
  className?: string
}

export function WebSourceBubbles({ sources, className }: WebSourceBubblesProps) {
  const [failedFavicons, setFailedFavicons] = useState<Set<string>>(new Set())

  if (!sources || sources.length === 0) return null

  // Deduplicate by URL
  const unique = sources.filter(
    (s, i, arr) => arr.findIndex((x) => x.url === s.url) === i
  )

  return (
    <div className={cn("mt-3 flex flex-col gap-1.5", className)}>
      <span className="text-xs text-muted-foreground font-medium">Sources</span>
      <div className="flex flex-wrap gap-1.5">
        {unique.map((source) => {
          const faviconUrl = getFavicon(source.url)
          const hasFavicon = faviconUrl && !failedFavicons.has(source.url)

          return (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              title={source.title}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                "bg-muted/40 hover:bg-muted border-border/60 hover:border-border",
                "text-xs text-foreground/80 hover:text-foreground",
                "transition-colors no-underline max-w-[180px]"
              )}
            >
              {hasFavicon ? (
                <Image
                  src={faviconUrl}
                  alt=""
                  width={12}
                  height={12}
                  className="size-3 rounded-sm shrink-0"
                  onError={() =>
                    setFailedFavicons((prev) => new Set(prev).add(source.url))
                  }
                />
              ) : (
                <div className="size-3 rounded-full bg-muted-foreground/30 shrink-0" />
              )}
              <span className="truncate">{formatUrl(source.url)}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
