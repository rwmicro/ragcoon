"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import type { VoiceStatus } from "@/app/hooks/use-voice-mode"

interface VoiceOrbProps {
  status: VoiceStatus
  audioLevel: number
  className?: string
  size?: "sm" | "md" | "lg"
}

export function VoiceOrb({ status, audioLevel, className, size = "md" }: VoiceOrbProps) {
  // Size configurations
  const sizeClasses = {
    sm: "h-32 w-32",
    md: "h-64 w-64",
    lg: "h-80 w-80",
  }

  // Get color based on status with more vibrant colors
  const getStatusColor = () => {
    switch (status) {
      case "listening":
        return {
          primary: "rgb(59, 130, 246)", // blue-500
          secondary: "rgb(96, 165, 250)", // blue-400
          tertiary: "rgb(147, 197, 253)", // blue-300
          glow: "rgba(59, 130, 246, 0.6)",
        }
      case "processing":
        return {
          primary: "rgb(168, 85, 247)", // purple-500
          secondary: "rgb(192, 132, 252)", // purple-400
          tertiary: "rgb(216, 180, 254)", // purple-300
          glow: "rgba(168, 85, 247, 0.6)",
        }
      case "speaking":
        return {
          primary: "rgb(16, 185, 129)", // emerald-500
          secondary: "rgb(52, 211, 153)", // emerald-400
          tertiary: "rgb(110, 231, 183)", // emerald-300
          glow: "rgba(16, 185, 129, 0.6)",
        }
      default:
        return {
          primary: "rgb(148, 163, 184)", // gray-400
          secondary: "rgb(203, 213, 225)", // gray-300
          tertiary: "rgb(226, 232, 240)", // gray-200
          glow: "rgba(148, 163, 184, 0.3)",
        }
    }
  }

  const colors = getStatusColor()
  const isActive = status !== "idle"

  // Calculate dynamic scale based on audio level with more range and punch
  const dynamicScale = isActive ? 1 + audioLevel * 0.8 : 1

  // More vibrant glow based on activity
  const glowIntensity = isActive ? 0.7 + audioLevel * 0.5 : 0.3

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      {/* Multiple layered background glows for depth - Enhanced */}
      <motion.div
        className="absolute inset-0 rounded-full blur-[100px]"
        style={{
          background: `radial-gradient(circle, ${colors.glow}, transparent 70%)`,
        }}
        animate={{
          opacity: isActive ? [0.4, glowIntensity + 0.2, 0.4] : 0.2,
          scale: isActive ? [0.8, 1.4 + audioLevel * 0.5, 0.8] : 1,
        }}
        transition={{
          duration: isActive ? 2 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute inset-8 rounded-full blur-[60px]"
        style={{
          background: `radial-gradient(circle, ${colors.primary}80, transparent 70%)`,
        }}
        animate={{
          opacity: isActive ? [0.3, 0.7, 0.3] : 0.1,
          scale: isActive ? [0.8, 1.2, 0.8] : 1,
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.2,
        }}
      />

      {/* Particle effects - More dynamic */}
      {isActive && (
        <>
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: colors.tertiary,
                left: "50%",
                top: "50%",
                boxShadow: `0 0 8px ${colors.glow}`,
              }}
              animate={{
                x: [0, Math.cos((i / 16) * Math.PI * 2) * (140 + Math.random() * 40), 0],
                y: [0, Math.sin((i / 16) * Math.PI * 2) * (140 + Math.random() * 40), 0],
                opacity: [0, 0.8, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: i * 0.1,
              }}
            />
          ))}
        </>
      )}

      {/* Outer rotating ring with gradient - Smoother */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, ${colors.tertiary}00, ${colors.tertiary}40, ${colors.tertiary}00)`,
          opacity: 0.5,
        }}
        animate={{
          rotate: isActive ? 360 : 0,
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Middle ring with pulse - More responsive */}
      <motion.div
        className="absolute inset-8 rounded-full border border-white/10"
        style={{
          borderColor: colors.secondary,
          boxShadow: `0 0 30px ${colors.glow}`,
        }}
        animate={{
          opacity: [0.2, 0.6, 0.2],
          scale: [0.95, 1.05, 0.95],
          rotate: isActive ? -360 : 0,
        }}
        transition={{
          opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
        }}
      />

      {/* Inner ring - Sharper */}
      <motion.div
        className="absolute inset-12 rounded-full border border-white/20"
        style={{
          borderColor: colors.primary,
          boxShadow: `inset 0 0 40px ${colors.glow}, 0 0 40px ${colors.glow}`,
        }}
        animate={{
          opacity: [0.3, 0.8, 0.3],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Core orb with enhanced effects - 3D feel */}
      <motion.div
        className="absolute inset-16 rounded-full shadow-2xl overflow-hidden backdrop-blur-sm"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${colors.tertiary}, ${colors.secondary} 40%, ${colors.primary} 80%)`,
          boxShadow: `0 0 80px ${colors.glow}, inset 0 0 50px ${colors.primary}60`,
        }}
        animate={{
          scale: dynamicScale,
        }}
        transition={{
          duration: 0.1,
          ease: "easeOut",
        }}
      >
        {/* Animated shimmer layers - Liquid effect */}
        <motion.div
          className="absolute inset-0 rounded-full mix-blend-overlay"
          style={{
            background: `linear-gradient(135deg, transparent 30%, ${colors.tertiary}90 50%, transparent 70%)`,
          }}
          animate={{
            rotate: isActive ? [0, 360] : 0,
            scale: [1, 1.2, 1],
          }}
          transition={{
            rotate: { duration: 4, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        <motion.div
          className="absolute inset-0 rounded-full mix-blend-overlay"
          style={{
            background: `linear-gradient(225deg, transparent 40%, ${colors.secondary}80 50%, transparent 60%)`,
          }}
          animate={{
            rotate: isActive ? [360, 0] : 0,
            scale: [1.1, 0.9, 1.1],
          }}
          transition={{
            rotate: { duration: 5, repeat: Infinity, ease: "linear" },
            scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        {/* Specular highlight */}
        <motion.div
          className="absolute top-6 left-6 w-1/3 h-1/3 rounded-full blur-xl bg-white/60"
          animate={{
            opacity: [0.4, 0.8, 0.4],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Enhanced waveform for speaking - Cleaner */}
      {status === "speaking" && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none">
          {[...Array(7)].map((_, i) => {
            const heightVariation = Math.sin(i * 0.8) * 15
            return (
              <motion.div
                key={i}
                className="w-2 rounded-full bg-white/90"
                style={{
                  boxShadow: `0 0 20px ${colors.glow}`,
                }}
                animate={{
                  height: [
                    `${20 + heightVariation}%`,
                    `${40 + audioLevel * 60 + heightVariation}%`,
                    `${20 + heightVariation}%`,
                  ],
                }}
                transition={{
                  duration: 0.3 + (i % 3) * 0.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.05,
                }}
              />
            )
          })}
        </div>
      )}

      {/* Listening pulse rings - More responsive */}
      {status === "listening" && (
        <>
          {[...Array(2)].map((_, i) => (
            <motion.div
              key={`listening-${i}`}
              className="absolute inset-0 rounded-full border border-white/30"
              style={{
                borderColor: colors.primary,
                boxShadow: `0 0 ${20 + audioLevel * 30}px ${colors.glow}`,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0.8 + audioLevel * 0.2, 0],
                scale: [0.8, 1.5 + audioLevel * 0.5],
              }}
              transition={{
                duration: 1.2 - audioLevel * 0.4,
                repeat: Infinity,
                ease: "easeOut",
                delay: i * 0.6,
              }}
            />
          ))}
        </>
      )}

      {/* Enhanced processing spinner - Elegant */}
      {status === "processing" && (
        <>
          <motion.div
            className="absolute inset-16 rounded-full border-t-2 border-r-2 border-transparent"
            style={{
              borderTopColor: "rgba(255,255,255,0.8)",
              borderRightColor: "rgba(255,255,255,0.4)",
              boxShadow: `0 0 30px ${colors.glow}`,
            }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <motion.div
            className="absolute inset-20 rounded-full border-b-2 border-l-2 border-transparent"
            style={{
              borderBottomColor: "rgba(255,255,255,0.8)",
              borderLeftColor: "rgba(255,255,255,0.4)",
            }}
            animate={{
              rotate: -360,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </>
      )}
    </div>
  )
}
