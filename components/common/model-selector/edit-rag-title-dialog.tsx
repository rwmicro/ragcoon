"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { toast } from "sonner"

type EditRagTitleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTitle: string
  onTitleUpdated: () => void
}

export function EditRagTitleDialog({
  open,
  onOpenChange,
  currentTitle,
  onTitleUpdated,
}: EditRagTitleDialogProps) {
  const [title, setTitle] = useState(currentTitle)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title cannot be empty")
      return
    }

    if (title.length > 100) {
      toast.error("Title must be 100 characters or less")
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch("/api/rag/set-title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: title.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update title")
      }

      toast.success("RAG model title updated successfully")
      onOpenChange(false)
      onTitleUpdated()
    } catch (error) {
      console.error("Error updating title:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to update title"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit RAG Model Title</DialogTitle>
          <DialogDescription>
            Set a custom name for your RAG knowledge base that will appear in
            the model selector.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Knowledge Base"
              maxLength={100}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleSave()
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/100 characters
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
