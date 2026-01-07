"use client"

import { useRef, useMemo, useEffect, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Sphere, MeshDistortMaterial } from "@react-three/drei"
import * as THREE from "three"

interface AnimatedOrbProps {
  colors: [string, string]
  agentState?: "idle" | "listening" | "processing" | "speaking" | null
  volumeMode?: "auto" | "manual"
  manualInput?: number
  manualOutput?: number
  getInputVolume?: () => number
  getOutputVolume?: () => number
  getFrequencyData?: () => { bass: number; mid: number; treble: number } | null
}

function AnimatedOrb({
  colors,
  agentState,
  volumeMode = "auto",
  manualInput = 0,
  manualOutput = 0,
  getInputVolume,
  getOutputVolume,
  getFrequencyData,
}: AnimatedOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<any>(null)

  // Smoothed values for more fluid animation
  const smoothedVolume = useRef(0)
  const smoothedBass = useRef(0)
  const smoothedMid = useRef(0)
  const smoothedTreble = useRef(0)

  // Get volume based on mode and state
  const getVolume = () => {
    if (volumeMode === "manual") {
      if (agentState === "listening" || agentState === "processing") {
        return manualInput
      } else if (agentState === "speaking") {
        return manualOutput
      }
      return 0
    } else {
      if (agentState === "listening" || agentState === "processing") {
        return getInputVolume?.() ?? 0
      } else if (agentState === "speaking") {
        return getOutputVolume?.() ?? 0
      }
      return 0
    }
  }

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return

    const volume = getVolume()
    const time = state.clock.getElapsedTime()

    // Get frequency data if available
    const freqData = getFrequencyData?.()
    const bass = freqData?.bass ?? 0
    const mid = freqData?.mid ?? 0
    const treble = freqData?.treble ?? 0

    // Smooth the values for fluid animation (lerp)
    const smoothFactor = 0.15
    smoothedVolume.current += (volume - smoothedVolume.current) * smoothFactor
    smoothedBass.current += (bass - smoothedBass.current) * smoothFactor
    smoothedMid.current += (mid - smoothedMid.current) * smoothFactor
    smoothedTreble.current += (treble - smoothedTreble.current) * smoothFactor

    // Animate rotation based on frequency bands
    if (agentState === "listening" || agentState === "speaking") {
      // Rotation speed influenced by mid and treble frequencies
      const rotationSpeedX = 0.2 + smoothedMid.current * 0.3
      const rotationSpeedY = 0.3 + smoothedTreble.current * 0.4
      meshRef.current.rotation.x = time * rotationSpeedX
      meshRef.current.rotation.y = time * rotationSpeedY

      // Add subtle wobble based on bass
      meshRef.current.rotation.z = Math.sin(time * 2) * smoothedBass.current * 0.1
    } else if (agentState === "processing") {
      meshRef.current.rotation.x = time * 0.5
      meshRef.current.rotation.y = time * 0.7
      meshRef.current.rotation.z = Math.sin(time * 3) * 0.1
    } else {
      meshRef.current.rotation.x = time * 0.1
      meshRef.current.rotation.y = time * 0.1
      meshRef.current.rotation.z = 0
    }

    // Animate scale based on volume and bass (bass creates more "punch")
    const baseScale = 1
    let scaleMultiplier = 1

    if (agentState === "idle" || !agentState) {
      scaleMultiplier = 1
    } else {
      // Use bass for main scale, mid for subtle variation
      scaleMultiplier = 1 + smoothedVolume.current * 0.2 + smoothedBass.current * 0.4
    }

    meshRef.current.scale.setScalar(baseScale * scaleMultiplier)

    // Animate distortion based on state, volume, and frequency
    if (agentState === "listening") {
      // Distortion responds to mid-range frequencies (voice range)
      materialRef.current.distort = 0.3 + smoothedMid.current * 0.5 + smoothedTreble.current * 0.2
      materialRef.current.speed = 2 + smoothedVolume.current * 3
    } else if (agentState === "processing") {
      materialRef.current.distort = 0.5 + Math.sin(time * 3) * 0.2
      materialRef.current.speed = 5
    } else if (agentState === "speaking") {
      // Speaking uses all frequency ranges for rich animation
      materialRef.current.distort = 0.4 + smoothedVolume.current * 0.3 + smoothedMid.current * 0.3
      materialRef.current.speed = 3 + smoothedVolume.current * 4
    } else {
      materialRef.current.distort = 0.2
      materialRef.current.speed = 1
    }
  })

  return (
    <Sphere ref={meshRef} args={[1, 128, 128]}>
      <MeshDistortMaterial
        ref={materialRef}
        color={colors[0]}
        emissive={colors[1]}
        emissiveIntensity={0.5}
        roughness={0.2}
        metalness={0.8}
        distort={0.3}
        speed={2}
      />
    </Sphere>
  )
}

interface OrbProps {
  colors?: [string, string]
  agentState?: "idle" | "listening" | "processing" | "speaking" | null
  volumeMode?: "auto" | "manual"
  manualInput?: number
  manualOutput?: number
  getInputVolume?: () => number
  getOutputVolume?: () => number
  getFrequencyData?: () => { bass: number; mid: number; treble: number } | null
  className?: string
}

export function Orb({
  colors = ["#3b82f6", "#8b5cf6"],
  agentState = null,
  volumeMode = "auto",
  manualInput = 0,
  manualOutput = 0,
  getInputVolume,
  getOutputVolume,
  getFrequencyData,
  className,
}: OrbProps) {
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component is mounted on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prevent SSR rendering of Canvas
  if (!isMounted) {
    return (
      <div className={className} style={{ width: "100%", height: "100%" }}>
        <div className="flex items-center justify-center h-full w-full">
          <div className="w-32 h-32 rounded-full bg-primary/10 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <AnimatedOrb
          colors={colors}
          agentState={agentState}
          volumeMode={volumeMode}
          manualInput={manualInput}
          manualOutput={manualOutput}
          getInputVolume={getInputVolume}
          getOutputVolume={getOutputVolume}
          getFrequencyData={getFrequencyData}
        />
      </Canvas>
    </div>
  )
}
