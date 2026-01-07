"use client"

import { KeyboardShortcutsDialog, useKeyboardShortcuts } from "./keyboard-shortcuts-dialog"

export function KeyboardShortcutsWrapper() {
  const { isDialogOpen, setIsDialogOpen } = useKeyboardShortcuts()

  return (
    <KeyboardShortcutsDialog
      isOpen={isDialogOpen}
      setIsOpen={setIsDialogOpen}
    />
  )
}
