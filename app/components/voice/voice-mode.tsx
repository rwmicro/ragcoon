"use client"

import { useState, useEffect, useRef } from "react"
import { useVoiceMode } from "@/app/hooks/use-voice-mode"
import { VoiceButton } from "./voice-button"
import { VoiceOrb } from "./voice-orb"
import { LiveWaveform } from "@/components/ui/live-waveform"
import { TranscriptionDisplay } from "./transcription-display"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

interface VoiceModeProps {
  onTranscript?: (text: string) => void
  onClose?: () => void
  className?: string
  apiUrl?: string
}

export function VoiceMode({ onTranscript, onClose, className, apiUrl }: VoiceModeProps) {
  const [error, setError] = useState<string | null>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { status, transcript, audioLevel, startListening, stopListening, isConnected, connect } =
    useVoiceMode({
      onTranscript: (text) => {
        onTranscript?.(text)
      },
      onError: (err) => {
        setError(err)

        // Clear any existing error timeout
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current)
        }

        errorTimeoutRef.current = setTimeout(() => setError(null), 3000)
      },
      apiUrl,
    })

  // Cleanup error timeout on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
    }
  }, [])

  // Auto-connect when component mounts (only once)
  useEffect(() => {
    connect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Map status to agent state for Orb
  const getAgentState = () => {
    switch (status) {
      case "listening":
        return "listening"
      case "processing":
        return "processing"
      case "speaking":
        return "speaking"
      default:
        return "idle"
    }
  }

  // Get orb colors based on status
  const getOrbColors = (): [string, string] => {
    switch (status) {
      case "listening":
        return ["#60a5fa", "#3b82f6"] // Blue
      case "processing":
        return ["#c084fc", "#a855f7"] // Purple
      case "speaking":
        return ["#34d399", "#10b981"] // Emerald
      default:
        return ["#94a3b8", "#64748b"] // Slate
    }
  }

  return (
    <div className={cn("relative flex flex-col items-center justify-center h-full w-full p-8 bg-background overflow-hidden", className)}>

      {/* Ambient Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-15 transition-colors duration-1000",
          status === "listening" ? "bg-blue-500" :
            status === "processing" ? "bg-purple-500" :
              status === "speaking" ? "bg-emerald-500" :
                "bg-slate-500"
        )} />
      </div>

      {/* Close button */}
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 right-6 rounded-full z-20 h-10 w-10 bg-background/20 backdrop-blur-md hover:bg-destructive/20 hover:text-destructive transition-all border border-white/10"
          onClick={onClose}
        >
          <X className="h-5 w-5" weight="bold" />
        </Button>
      )}

      {/* Connection status */}
      <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/40 backdrop-blur-md border border-white/10 text-xs font-medium text-muted-foreground z-20">
        <div className={cn("h-2 w-2 rounded-full shadow-sm transition-colors", isConnected ? "bg-emerald-500 shadow-emerald-500/50" : "bg-red-500 shadow-red-500/50")} />
        <span>{isConnected ? "Connected" : "Connecting..."}</span>
      </div>

      {/* Main content - centered */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl space-y-8">

        {/* Enhanced Voice Orb */}
        <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
          <VoiceOrb
            status={status}
            audioLevel={audioLevel}
            size="lg"
            className="w-full h-full"
          />
        </div>

        {/* Live Waveform */}
        <div className="w-full max-w-xl h-20 rounded-2xl bg-background/30 backdrop-blur-md border border-white/10 overflow-hidden shadow-inner flex items-center justify-center p-4">
          <LiveWaveform
            active={status === "listening"}
            processing={status === "processing"}
            height={60}
            mode="static"
            barWidth={4}
            barGap={3}
            sensitivity={2.0}
            getAudioLevel={() => audioLevel}
            barColor={status === "speaking" ? "#10b981" : "#3b82f6"}
            className="w-full opacity-80"
          />
        </div>

        {/* Transcription display */}
        <div className="w-full flex justify-center min-h-[80px]">
          <TranscriptionDisplay transcript={transcript} status={status} />
        </div>

        {/* Voice button */}
        <div className="pt-4">
          <VoiceButton
            status={status}
            audioLevel={audioLevel}
            onStart={startListening}
            onStop={stopListening}
            disabled={!isConnected}
            className="h-16 w-16"
          />
        </div>

        {/* Instructions */}
        <motion.div
          className="text-center text-sm font-medium text-muted-foreground/80 max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {status === "idle" && <p>Tap the microphone to start speaking</p>}
          {status === "listening" && <p>Listening... Tap stop when finished</p>}
          {status === "processing" && <p>Processing your speech...</p>}
          {status === "speaking" && <p>Playing response...</p>}
        </motion.div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-destructive/90 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-medium shadow-xl z-50 border border-white/10"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
