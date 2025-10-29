"use client"

import { Button } from "@/components/ui/button"
import { CaretLeft, SealCheck, Spinner } from "@phosphor-icons/react"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"

const TRANSITION_CONTENT = {
  ease: "easeOut",
  duration: 0.2,
}

type FeedbackFormProps = {
  authUserId?: string
  onClose: () => void
}

export function FeedbackForm({ authUserId, onClose }: FeedbackFormProps) {
  // Feedback feature is disabled in SQLite-only mode
  return null

}
