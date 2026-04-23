"use client"

import { useRef, useEffect, useState } from "react"

interface LiveWaveformProps {
  active?: boolean
  processing?: boolean
  barWidth?: number
  barGap?: number
  barColor?: string
  height?: number | string
  mode?: "static" | "scrolling"
  sensitivity?: number
  fadeEdges?: boolean
  className?: string
  getAudioLevel?: () => number
}

export function LiveWaveform({
  active = false,
  processing = false,
  barWidth = 3,
  barGap = 1,
  barColor,
  height = 64,
  mode = "static",
  sensitivity = 1,
  fadeEdges = true,
  className,
  getAudioLevel,
}: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const historyRef = useRef<number[]>([])
  const processingAnimationRef = useRef(0)
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component is mounted on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !isMounted) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Setup HiDPI canvas
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Setup audio context when active
    if (active && !audioContextRef.current && !getAudioLevel) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          mediaStreamRef.current = stream
          audioContextRef.current = new AudioContext()
          analyserRef.current = audioContextRef.current.createAnalyser()
          analyserRef.current.fftSize = 256
          analyserRef.current.smoothingTimeConstant = 0.8

          const source = audioContextRef.current.createMediaStreamSource(stream)
          source.connect(analyserRef.current)
        })
        .catch((err) => {
          console.error("Failed to get microphone access:", err)
        })
    }

    const draw = () => {
      if (!ctx || !canvas) return

      const width = rect.width
      const height = rect.height

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      if (processing) {
        // Draw animated processing waves
        drawProcessingWaves(ctx, width, height)
      } else if (active || getAudioLevel) {
        if (mode === "static") {
          drawStaticWaveform(ctx, width, height)
        } else {
          drawScrollingWaveform(ctx, width, height)
        }
      }

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    const drawProcessingWaves = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      processingAnimationRef.current += 0.05
      const time = processingAnimationRef.current

      ctx.strokeStyle = barColor || getComputedStyle(canvas).getPropertyValue("--foreground") || "#000"
      ctx.lineWidth = 2
      ctx.lineCap = "round"

      // Draw multiple sine waves
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        const offset = (i * Math.PI * 2) / 3
        const amplitude = height / 4

        for (let x = 0; x < width; x++) {
          const y =
            height / 2 +
            Math.sin((x / width) * Math.PI * 4 + time + offset) * amplitude * 0.5 +
            Math.sin((x / width) * Math.PI * 2 - time + offset) * amplitude * 0.3

          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        ctx.globalAlpha = 0.3 + i * 0.2
        ctx.stroke()
      }

      ctx.globalAlpha = 1
    }

    const drawStaticWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      let dataArray: Uint8Array<ArrayBuffer>

      if (getAudioLevel) {
        // Use provided audio level function with more natural variation
        const level = getAudioLevel()
        const numBars = Math.floor(width / (barWidth + barGap))
        dataArray = new Uint8Array(numBars)

        // Create more natural looking waveform with sine-based variation
        const time = Date.now() / 1000
        for (let i = 0; i < numBars; i++) {
          const normalizedPos = i / numBars
          // Create bell curve for center emphasis
          const centerFalloff = 1 - Math.pow((normalizedPos - 0.5) * 2, 2)
          // Add some sine wave variation for more organic look
          const sineVariation = 0.7 + Math.sin(normalizedPos * Math.PI * 4 + time * 2) * 0.3
          const randomVariation = 0.7 + Math.random() * 0.3

          dataArray[i] = level * 255 * sensitivity * centerFalloff * sineVariation * randomVariation
        }
      } else if (analyserRef.current) {
        dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
      } else {
        return
      }

      const numBars = Math.floor(width / (barWidth + barGap))
      const barStep = Math.floor(dataArray.length / numBars)

      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + barGap)
        let barHeight = 0

        // Average frequency data for this bar
        for (let j = 0; j < barStep; j++) {
          barHeight += dataArray[i * barStep + j] || 0
        }
        barHeight = (barHeight / barStep / 255) * height * sensitivity

        // Apply fade edges
        let opacity = 1
        if (fadeEdges) {
          const fadeLength = numBars * 0.1
          if (i < fadeLength) {
            opacity = i / fadeLength
          } else if (i > numBars - fadeLength) {
            opacity = (numBars - i) / fadeLength
          }
        }

        // Draw symmetric bars with rounded caps
        const centerY = height / 2
        const halfHeight = barHeight / 2

        ctx.fillStyle = barColor || getComputedStyle(canvas).getPropertyValue("--foreground") || "#000"
        ctx.globalAlpha = opacity

        // Draw with rounded caps
        ctx.beginPath()
        const radius = Math.min(barWidth / 2, 2)
        const rectX = x
        const rectY = centerY - halfHeight
        const rectWidth = barWidth
        const rectHeight = Math.max(barHeight, 2)

        ctx.roundRect(rectX, rectY, rectWidth, rectHeight, radius)
        ctx.fill()
      }

      ctx.globalAlpha = 1
    }

    const drawScrollingWaveform = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number
    ) => {
      let averageVolume = 0

      if (getAudioLevel) {
        averageVolume = getAudioLevel() * sensitivity
      } else if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        const sum = dataArray.reduce((a, b) => a + b, 0)
        averageVolume = (sum / dataArray.length / 255) * sensitivity
      }

      // Add to history
      historyRef.current.push(averageVolume)
      const maxBars = Math.floor(width / (barWidth + barGap))
      if (historyRef.current.length > maxBars) {
        historyRef.current.shift()
      }

      // Draw history bars from right to left
      for (let i = 0; i < historyRef.current.length; i++) {
        const x = width - (i + 1) * (barWidth + barGap)
        const barHeight = historyRef.current[historyRef.current.length - 1 - i] * height

        // Apply fade edges
        let opacity = 1
        if (fadeEdges) {
          const fadeLength = maxBars * 0.1
          if (i < fadeLength) {
            opacity = i / fadeLength
          }
        }

        ctx.fillStyle = barColor || getComputedStyle(canvas).getPropertyValue("--foreground") || "#000"
        ctx.globalAlpha = opacity

        // Draw with rounded caps
        const radius = Math.min(barWidth / 2, 2)
        ctx.beginPath()
        ctx.roundRect(x, height - Math.max(barHeight, 2), barWidth, Math.max(barHeight, 2), radius)
        ctx.fill()
      }

      ctx.globalAlpha = 1
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [active, processing, barWidth, barGap, barColor, mode, sensitivity, fadeEdges, getAudioLevel, isMounted])

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const heightStyle = typeof height === "number" ? `${height}px` : height

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: heightStyle, display: "block" }}
    />
  )
}
