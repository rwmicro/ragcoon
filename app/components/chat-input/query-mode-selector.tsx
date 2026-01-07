"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ChatText,
  FileText,
  ArrowsLeftRight,
  MagnifyingGlass,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export type QueryMode = "qa" | "summarize" | "compare" | "extract"

export interface QueryModeOption {
  value: QueryMode
  label: string
  description: string
  icon: React.ComponentType<any>
  systemPrompt: string
}

export const QUERY_MODES: QueryModeOption[] = [
  {
    value: "qa",
    label: "Q&A",
    description: "Ask questions and get detailed answers",
    icon: ChatText,
    systemPrompt: "You are a helpful assistant that answers questions based on the provided context. Provide clear, accurate, and concise answers.",
  },
  {
    value: "summarize",
    label: "Summarize",
    description: "Get a summary of the information",
    icon: FileText,
    systemPrompt: "You are a summarization assistant. Create concise, well-structured summaries that capture the key points from the provided context.",
  },
  {
    value: "compare",
    label: "Compare",
    description: "Compare different aspects or documents",
    icon: ArrowsLeftRight,
    systemPrompt: "You are a comparison assistant. Identify similarities and differences, highlight key distinctions, and provide balanced analysis based on the provided context.",
  },
  {
    value: "extract",
    label: "Extract",
    description: "Extract specific information or data",
    icon: MagnifyingGlass,
    systemPrompt: "You are an information extraction assistant. Identify and extract specific data points, facts, or entities from the provided context in a structured format.",
  },
]

interface QueryModeSelectorProps {
  value: QueryMode
  onChange: (mode: QueryMode) => void
  variant?: "compact" | "full"
  className?: string
}

export function QueryModeSelector({
  value,
  onChange,
  variant = "compact",
  className,
}: QueryModeSelectorProps) {
  const currentMode = QUERY_MODES.find(m => m.value === value) || QUERY_MODES[0]

  if (variant === "compact") {
    return (
      <div className={cn("flex gap-1", className)}>
        {QUERY_MODES.map((mode) => {
          const Icon = mode.icon
          const isActive = value === mode.value

          return (
            <Tooltip key={mode.value}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0",
                    !isActive && "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onChange(mode.value)}
                >
                  <Icon className="size-4" weight={isActive ? "fill" : "regular"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="font-medium">{mode.label}</p>
                <p className="text-xs text-muted-foreground">{mode.description}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={(val) => onChange(val as QueryMode)}>
      <SelectTrigger className={cn("w-[180px]", className)}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <currentMode.icon className="size-4" />
            <span>{currentMode.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {QUERY_MODES.map((mode) => {
          const Icon = mode.icon
          return (
            <SelectItem key={mode.value} value={mode.value}>
              <div className="flex items-center gap-3">
                <Icon className="size-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium">{mode.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {mode.description}
                  </span>
                </div>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
