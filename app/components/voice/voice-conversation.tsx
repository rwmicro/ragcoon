"use client"

import { useEffect, useState, useRef } from "react"
import { useVoiceConversation } from "@/app/hooks/use-voice-conversation"
import { Orb } from "@/components/ui/orb"
import { LiveWaveform } from "@/components/ui/live-waveform"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { X, Microphone, Waveform } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"

interface VoiceConversationProps {
  onTranscript?: (text: string) => void
  onClose?: () => void
  className?: string
  lastResponse?: string // Latest response from LLM to speak
}

export function VoiceConversation({
  onTranscript,
  onClose,
  className,
  lastResponse,
}: VoiceConversationProps) {
  const [error, setError] = useState<string | null>(null)
  const [currentTranscript, setCurrentTranscript] = useState<string>("")
  const [spokenResponse, setSpokenResponse] = useState<string>("")
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { status, isActive, audioLevel, start, stop, speakResponse, getFrequencyData } =
    useVoiceConversation({
      onTranscript: (text) => {
        setCurrentTranscript(text)
        onTranscript?.(text)
      },
      onError: (err) => {
        setError(err)

        // Clear any existing error timeout
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current)
        }

        errorTimeoutRef.current = setTimeout(() => setError(null), 5000)
      },
    })

  // Cleanup error timeout on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
    }
  }, [])

  // Auto-speak when new response arrives
  useEffect(() => {
    if (lastResponse && lastResponse !== spokenResponse && status !== "speaking") {
      console.log("🔊 Auto-speaking response:", lastResponse)
      setSpokenResponse(lastResponse)
      speakResponse(lastResponse)
    }
  }, [lastResponse, spokenResponse, status, speakResponse])

  // Auto-start on mount
  useEffect(() => {
    start()
  }, [start])

  const handleToggle = () => {
    if (isActive) {
      stop()
      onClose?.()
    } else {
      start()
    }
  }

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

  // Get orb colors based on status - Updated for premium look
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
    <div className={cn("relative w-full min-h-[600px] bg-gradient-to-b from-background via-background/95 to-background/90 flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-border/50 shadow-2xl", className)}>

      {/* Ambient Background Glow - Made more subtle and premium */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-10 transition-colors duration-1000",
          status === "listening" ? "bg-blue-500" :
            status === "processing" ? "bg-purple-500" :
              status === "speaking" ? "bg-emerald-500" :
                "bg-slate-500"
        )} />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" />
      </div>

      {/* Close button - Enhanced */}
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 right-6 rounded-full z-20 h-12 w-12 bg-background/10 backdrop-blur-md hover:bg-destructive/10 hover:text-destructive transition-all duration-300 border border-white/5 hover:border-destructive/20 hover:scale-105"
          onClick={() => {
            stop()
            onClose()
          }}
        >
          <X className="h-5 w-5" weight="bold" />
        </Button>
      )}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-between w-full h-full max-w-4xl px-6 py-12 space-y-8">

        {/* Top Section: Status & Transcript */}
        <div className="w-full flex flex-col items-center space-y-6 min-h-[160px]">
          {/* Status Indicator - Refined */}
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-xl border shadow-sm transition-all duration-500",
                status === "listening" ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                  status === "processing" ? "bg-purple-500/10 border-purple-500/20 text-purple-500" :
                    status === "speaking" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                      "bg-muted/30 border-white/5 text-muted-foreground"
              )}
            >
              {status === "idle" && <span className="text-sm font-medium">Ready to Chat</span>}
              {status === "listening" && (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </span>
                  <span className="text-sm font-medium tracking-wide">Listening</span>
                </>
              )}
              {status === "processing" && (
                <>
                  <div className="h-2.5 w-2.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span className="text-sm font-medium tracking-wide">Thinking</span>
                </>
              )}
              {status === "speaking" && (
                <>
                  <Waveform className="w-4 h-4 animate-pulse" weight="fill" />
                  <span className="text-sm font-medium tracking-wide">Speaking</span>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Transcript Display */}
          <div className="w-full max-w-2xl text-center">
            <AnimatePresence mode="wait">
              {currentTranscript ? (
                <motion.div
                  key="transcript"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="relative group"
                >
                  <div className="absolute -inset-4 bg-gradient-to-r from-transparent via-background/50 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <p className="relative text-2xl md:text-3xl font-medium text-foreground/90 leading-relaxed tracking-tight">
                    &quot;{currentTranscript}&quot;
                  </p>
                </motion.div>
              ) : (
                <motion.p
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-muted-foreground/40 text-xl font-light"
                >
                  Start speaking...
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Middle Section: Orb */}
        <div className="flex-1 w-full flex items-center justify-center py-8">
          <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent rounded-full blur-3xl opacity-50" />
            <Orb
              colors={getOrbColors()}
              agentState={getAgentState()}
              volumeMode="manual"
              manualInput={audioLevel}
              manualOutput={audioLevel}
              getFrequencyData={getFrequencyData}
              className="w-full h-full scale-125"
            />
          </div>
        </div>

        {/* Bottom Section: Controls & Waveform */}
        <div className="w-full max-w-md flex flex-col items-center space-y-8">

          {/* Waveform Visualization */}
          <div className="h-16 w-full flex items-center justify-center">
            <AnimatePresence mode="wait">
              {(status === "listening" || status === "speaking") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full"
                >
                  <LiveWaveform
                    active={true}
                    processing={false}
                    height={48}
                    mode="static"
                    barWidth={3}
                    barGap={4}
                    sensitivity={1.5}
                    getAudioLevel={() => audioLevel}
                    barColor={status === "speaking" ? "#10b981" : "#3b82f6"}
                    className="w-full opacity-60"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main Control Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className={cn(
              "absolute inset-0 rounded-full blur-xl transition-all duration-500",
              isActive ? "bg-red-500/20" : "bg-primary/20"
            )} />
            <Button
              size="lg"
              variant={isActive ? "destructive" : "default"}
              onClick={handleToggle}
              className={cn(
                "relative h-20 px-10 rounded-full shadow-2xl transition-all duration-500 hover:scale-105 active:scale-95 text-lg font-semibold border border-white/10",
                isActive
                  ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/25"
                  : "bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-700 shadow-primary/25"
              )}
            >
              {isActive ? (
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-white/20 rounded-full">
                    <X className="h-5 w-5" weight="bold" />
                  </div>
                  <span>End Session</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-white/20 rounded-full">
                    <Microphone className="h-5 w-5" weight="fill" />
                  </div>
                  <span>Start Conversation</span>
                </div>
              )}
            </Button>
          </motion.div>
        </div>

      </div>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-destructive/90 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-medium shadow-xl z-50 border border-white/10 flex items-center gap-2"
          >
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
