"use client"

import type { ReactNode } from "react"
import type { Icon } from "@phosphor-icons/react"
import { Info } from "@phosphor-icons/react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type RetrievalFeatureCardProps = {
  id: string
  icon: Icon
  /** Tailwind classes for the icon badge, e.g. "bg-emerald-500/10 text-emerald-500" */
  iconClassName: string
  title: string
  tooltip: string
  subtitle: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Expanded controls, rendered (indented) only when the feature is enabled. */
  children?: ReactNode
}

/**
 * Card used for each toggleable retrieval feature (Multi-Query, HyDE, Graph RAG,
 * MMR, Multi-Hop). Renders a labelled switch with an info tooltip and reveals
 * its detailed controls when enabled.
 */
export function RetrievalFeatureCard({
  id,
  icon: IconComponent,
  iconClassName,
  title,
  tooltip,
  subtitle,
  checked,
  onCheckedChange,
  children,
}: RetrievalFeatureCardProps) {
  return (
    <div className="space-y-4 p-5 rounded-xl border bg-card/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`size-8 rounded-lg flex items-center justify-center ${iconClassName}`}
          >
            <IconComponent className="size-5" weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor={id} className="font-medium cursor-pointer">
                {title}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </div>

      {checked && children && (
        <div className="pl-11 space-y-5 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  )
}
