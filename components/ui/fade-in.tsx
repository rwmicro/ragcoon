"use client"

import { motion } from "motion/react"
import * as React from "react"

interface FadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  stagger?: number
  direction?: "up" | "down" | "left" | "right" | "none"
  distance?: number
}

function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.4,
  stagger = 0.1,
  direction = "up",
  distance = 20,
}: FadeInProps) {
  const directionOffset = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  }

  const childrenArray = React.Children.toArray(children)

  // If single child, render without stagger
  if (childrenArray.length === 1) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0, ...directionOffset[direction] }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{
          duration,
          delay,
          ease: "easeOut",
        }}
      >
        {children}
      </motion.div>
    )
  }

  // Multiple children - use stagger
  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, ...directionOffset[direction] }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{
            duration,
            delay: delay + index * stagger,
            ease: "easeOut",
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

export { FadeIn }
