"use client"

import { motion } from "framer-motion"
import { GlobeIcon } from "@phosphor-icons/react"

export function WebSearchAnimation() {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="relative flex items-center justify-center">
        {/* Animated globe icon */}
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <GlobeIcon className="size-5 text-blue-500" weight="duotone" />
        </motion.div>

        {/* Pulsing rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-blue-500"
            initial={{ opacity: 0, scale: 1 }}
            animate={{
              opacity: [0, 0.6, 0],
              scale: [1, 2, 2.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
              delay: i * 0.6,
            }}
          />
        ))}
      </div>

      {/* Animated text */}
      <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
        <span className="font-medium">Searching the web</span>
        <motion.span
          animate={{
            opacity: [1, 0.3, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <AnimatedDots />
        </motion.span>
      </div>
    </div>
  )
}

function AnimatedDots() {
  return (
    <span className="inline-flex gap-0.5">
      {[...Array(3)].map((_, i) => (
        <motion.span
          key={i}
          animate={{
            opacity: [0.3, 1, 0.3],
            y: [0, -3, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        >
          •
        </motion.span>
      ))}
    </span>
  )
}
