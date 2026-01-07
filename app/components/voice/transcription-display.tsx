"use client"

import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import type { VoiceStatus } from "@/app/hooks/use-voice-mode"

interface TranscriptionDisplayProps {
  transcript: string
  status: VoiceStatus
  className?: string
}

export function TranscriptionDisplay({ transcript, status, className }: TranscriptionDisplayProps) {
  const isVisible = transcript.length > 0 || status === "listening" || status === "processing"

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "relative inline-block rounded-3xl border border-white/10 bg-background/40 backdrop-blur-xl shadow-2xl px-8 py-6 max-w-3xl mx-auto",
            className
          )}
        >
          {/* Gradient border effect - Enhanced */}
          <div className={cn(
            "absolute inset-0 rounded-3xl opacity-30 pointer-events-none transition-colors duration-700",
            status === "listening" ? "bg-gradient-to-r from-blue-500/30 via-cyan-500/30 to-blue-500/30" :
              status === "processing" ? "bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-purple-500/30" :
                status === "speaking" ? "bg-gradient-to-r from-emerald-500/30 via-teal-500/30 to-emerald-500/30" :
                  "bg-transparent"
          )} />

          {/* Transcript text */}
          <div className="relative flex flex-col items-center gap-4 text-center">

            {/* Status Icon */}
            <motion.div
              className={cn("h-3 w-3 rounded-full shrink-0 shadow-lg transition-all duration-500", {
                "bg-blue-500 shadow-blue-500/50": status === "listening",
                "bg-purple-500 shadow-purple-500/50": status === "processing",
                "bg-emerald-500 shadow-emerald-500/50": status === "speaking",
                "bg-muted-foreground/30": status === "idle",
              })}
              animate={{
                scale: status === "listening" ? [1, 1.5, 1] : 1,
                opacity: status === "listening" ? [1, 0.5, 1] : 1,
              }}
              transition={{
                duration: 2,
                repeat: status === "listening" ? Infinity : 0,
                ease: "easeInOut"
              }}
            />

            <div className="min-w-0 w-full">
              {transcript ? (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl md:text-2xl font-medium text-foreground/95 leading-relaxed tracking-tight"
                >
                  {transcript}
                </motion.p>
              ) : (
                <motion.div
                  className="flex items-center justify-center gap-2"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {status === "listening" && (
                    <span className="text-lg text-muted-foreground font-light tracking-wide">Listening...</span>
                  )}
                  {status === "processing" && (
                    <span className="text-lg text-muted-foreground font-light tracking-wide">Processing...</span>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
