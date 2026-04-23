"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Keyboard, Command } from "@phosphor-icons/react"

interface Shortcut {
  keys: string[]
  description: string
  category: string
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ["Ctrl", "K"], description: "Search chats & messages", category: "Navigation" },
  { keys: ["Ctrl", "B"], description: "Toggle sidebar", category: "Navigation" },

  // Selectors
  { keys: ["Ctrl", "Shift", "P"], description: "Open model selector", category: "Selectors" },
  { keys: ["Ctrl", "Shift", "M"], description: "Open multi-model selector", category: "Selectors" },

  // Chat
  { keys: ["Enter"], description: "Send message", category: "Chat" },
  { keys: ["Shift", "Enter"], description: "New line in message", category: "Chat" },

  // General
  { keys: ["?"], description: "Show keyboard shortcuts", category: "General" },
  { keys: ["Esc"], description: "Close dialog / cancel", category: "General" },
]

interface KeyboardShortcutsDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function KeyboardShortcutsDialog({
  isOpen,
  setIsOpen,
}: KeyboardShortcutsDialogProps) {
  const categories = Array.from(new Set(shortcuts.map(s => s.category)))

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5" weight="duotone" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick reference for all available keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, j) => (
                          <Badge
                            key={j}
                            variant="secondary"
                            className="font-mono text-xs px-2 py-0.5"
                          >
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-4 border-t text-xs text-muted-foreground">
          <Command className="size-4" />
          <span>
            Use <Badge variant="secondary" className="text-[10px] mx-1">Cmd</Badge> on Mac,{" "}
            <Badge variant="secondary" className="text-[10px] mx-1">Ctrl</Badge> on Windows/Linux
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function useKeyboardShortcuts() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts dialog with ?
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement
        // Don't trigger if typing in input/textarea
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault()
          setIsDialogOpen(true)
        }
      }

      // Close dialog with Escape
      if (e.key === "Escape" && isDialogOpen) {
        setIsDialogOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDialogOpen])

  return {
    isDialogOpen,
    setIsDialogOpen,
  }
}
