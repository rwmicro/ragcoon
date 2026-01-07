import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { GlobeIcon } from "@phosphor-icons/react"
import React from "react"

type ButtonSearchProps = {
  isSelected?: boolean
  onToggle?: (isSelected: boolean) => void
}

export function ButtonSearch({
  isSelected = false,
  onToggle,
}: ButtonSearchProps) {
  const handleClick = () => {
    const newState = !isSelected
    onToggle?.(newState)
  }


  return (
    <Button
      variant="secondary"
      size="default"
      className={cn(
        "border-border dark:bg-secondary h-9 rounded-full border bg-transparent transition-all duration-150",
        "px-4 min-w-[140px] w-auto",
        "flex items-center justify-center gap-2.5",
        isSelected &&
          "border-[#0091FF]/20 bg-[#E5F3FE] text-[#0091FF] hover:bg-[#E5F3FE] hover:text-[#0091FF] dark:bg-[#0091FF]/10 dark:border-[#0091FF]/30 dark:text-[#0091FF]"
      )}
      onClick={handleClick}
    >
      <GlobeIcon className="size-4 shrink-0" weight="duotone" />
      <span className="text-sm font-medium whitespace-nowrap">Web Search</span>
    </Button>
  )
}
