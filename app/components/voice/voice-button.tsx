"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Microphone, Stop } from "@phosphor-icons/react"
import { motion } from "framer-motion"
import type { VoiceStatus } from "@/app/hooks/use-voice-mode"

interface VoiceButtonProps {
  status: VoiceStatus
  audioLevel: number
  onStart: () => void
  onStop: () => void
  disabled?: boolean
  className?: string
}

export function VoiceButton({
  status,
  audioLevel,
  onStart,
  onStop,
  disabled = false,
  className,
}: VoiceButtonProps) {
  const isListening = status === "listening"
  const isProcessing = status === "processing"
  const isSpeaking = status === "speaking"
  const isActive = isListening || isProcessing || isSpeaking

  const handleClick = () => {
    if (isListening) {
      onStop()
    } else if (status === "idle") {
      onStart()
    }
  }

  // Get color based on status with gradients
  const getStatusColor = () => {
    switch (status) {
      case "listening":
        return {
          bg: "bg-gradient-to-br from-blue-400 to-blue-600",
          shadow: "shadow-blue-500/30",
          ring: "bg-blue-500",
        }
      case "processing":
        return {
          bg: "bg-gradient-to-br from-purple-400 to-purple-600",
          shadow: "shadow-purple-500/30",
          ring: "bg-purple-500",
        }
      case "speaking":
        return {
          bg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
          shadow: "shadow-emerald-500/30",
          ring: "bg-emerald-500",
        }
      default:
        return {
          bg: "bg-muted",
          shadow: "shadow-none",
          ring: "bg-muted-foreground",
        }
    }
  }

  const colors = getStatusColor()

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Outer pulse rings */}
      {isActive && (
        <>
          <motion.div
            className={cn("absolute inset-0 rounded-full", colors.ring)}
            initial={{ opacity: 0, scale: 1 }}
            animate={{
              scale: [1, 1.6, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className={cn("absolute inset-0 rounded-full", colors.ring)}
            initial={{ opacity: 0, scale: 1 }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          />
        </>
      )}

      {/* Audio level indicator (for listening state) */}
      {isListening && (
        <motion.div
          className={cn("absolute inset-0 rounded-full", colors.ring)}
          animate={{
            scale: 1 + audioLevel * 0.4,
            opacity: 0.2 + audioLevel * 0.3,
          }}
          transition={{
            duration: 0.1,
          }}
        />
      )}

      {/* Main button */}
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          "relative h-12 w-12 rounded-full transition-all duration-300 border-0",
          isActive ? [colors.bg, colors.shadow, "shadow-lg text-white hover:opacity-90"] : "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
          className
        )}
        onClick={handleClick}
        disabled={disabled || isProcessing || isSpeaking}
      >
        {/* Icon */}
        <motion.div
          animate={{
            scale: isActive ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 0.5,
            repeat: isActive ? Infinity : 0,
          }}
        >
          {isListening ? (
            <Stop className="h-5 w-5" weight="fill" />
          ) : (
            <Microphone className="h-5 w-5" weight={isActive ? "fill" : "regular"} />
          )}
        </motion.div>

        {/* Processing spinner */}
        {isProcessing && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white/20 border-t-white"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </Button>

      {/* Status text */}
      {isActive && (
        <motion.div
          className={cn(
            "absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-semibold whitespace-nowrap px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm",
            status === "listening" ? "text-blue-500" :
              status === "processing" ? "text-purple-500" :
                status === "speaking" ? "text-emerald-500" : "text-muted-foreground"
          )}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
        >
          {status === "listening" && "Listening..."}
          {status === "processing" && "Processing..."}
          {status === "speaking" && "Speaking..."}
        </motion.div>
      )}
    </div>
  )
}
