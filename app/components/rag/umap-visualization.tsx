"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Text } from "@react-three/drei"
import * as THREE from "three"
import { getCollectionUMAP } from "@/lib/api/rag"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface UMAPPoint {
  coordinates: number[]
  label: string
  metadata: {
    chunk_id: string
    source: string
    file_name: string
  }
}

interface UMAPData {
  points: UMAPPoint[]
  labels: string[]
  stats: {
    num_points: number
    n_components: number
    n_neighbors: number
    min_dist: number
    metric: string
  }
}

// Point component for 2D/3D visualization
function Point({ point, isHovered, onPointerOver, onPointerOut, is3D }: {
  point: UMAPPoint & { position: [number, number, number], color: string }
  isHovered: boolean
  onPointerOver: () => void
  onPointerOut: () => void
  is3D: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    setScale(isHovered ? 2.5 : 1)
  }, [isHovered])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scale)
    }
  })

  return (
    <group position={point.position}>
      <mesh
        ref={meshRef}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          color={point.color}
          emissive={point.color}
          emissiveIntensity={isHovered ? 0.8 : 0.3}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
      {isHovered && (
        <Text
          position={[0, 0.2, 0]}
          fontSize={0.1}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000000"
          maxWidth={2}
        >
          {point.label.substring(0, 80)}...
        </Text>
      )}
    </group>
  )
}

// UMAP scene component
function UMAPScene({ umapData, is3D }: { umapData: UMAPData, is3D: boolean }) {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null)
  const [points, setPoints] = useState<Array<UMAPPoint & { position: [number, number, number], color: string }>>([])

  useEffect(() => {
    if (!umapData) return

    // Normalize coordinates to fit in view
    const coords = umapData.points.map(p => p.coordinates)
    const xVals = coords.map(c => c[0])
    const yVals = coords.map(c => c[1])
    const zVals = is3D ? coords.map(c => c[2] || 0) : coords.map(() => 0)

    const xMin = Math.min(...xVals)
    const xMax = Math.max(...xVals)
    const yMin = Math.min(...yVals)
    const yMax = Math.max(...yVals)
    const zMin = Math.min(...zVals)
    const zMax = Math.max(...zVals)

    const xRange = xMax - xMin || 1
    const yRange = yMax - yMin || 1
    const zRange = is3D ? (zMax - zMin || 1) : 1

    const scale = 10

    // Color points by source file
    const fileColors = new Map<string, string>()
    const colorPalette = [
      "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa",
      "#06b6d4", "#f87171", "#fb923c", "#4ade80", "#818cf8"
    ]
    let colorIndex = 0

    const processedPoints = umapData.points.map((point) => {
      const fileName = point.metadata.file_name
      if (!fileColors.has(fileName)) {
        fileColors.set(fileName, colorPalette[colorIndex % colorPalette.length])
        colorIndex++
      }

      const normalizedX = ((point.coordinates[0] - xMin) / xRange - 0.5) * scale
      const normalizedY = ((point.coordinates[1] - yMin) / yRange - 0.5) * scale
      const normalizedZ = is3D ? ((point.coordinates[2] - zMin) / zRange - 0.5) * scale : 0

      return {
        ...point,
        position: [normalizedX, normalizedY, normalizedZ] as [number, number, number],
        color: fileColors.get(fileName) || "#9ca3af"
      }
    })

    setPoints(processedPoints)
  }, [umapData, is3D])

  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.4} />

      {/* Points */}
      {points.map((point, i) => (
        <Point
          key={i}
          point={point}
          isHovered={hoveredPointIndex === i}
          onPointerOver={() => setHoveredPointIndex(i)}
          onPointerOut={() => setHoveredPointIndex(null)}
          is3D={is3D}
        />
      ))}

      {/* Camera controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        enableRotate={is3D}
      />
    </>
  )
}

// Main component
export function UMAPVisualization({ collectionId }: { collectionId: string }) {
  const [umapData, setUmapData] = useState<UMAPData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Settings
  const [nComponents, setNComponents] = useState<2 | 3>(2)
  const [nNeighbors, setNNeighbors] = useState(15)
  const [minDist, setMinDist] = useState(0.1)
  const [metric, setMetric] = useState("cosine")

  useEffect(() => {
    const loadUMAP = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getCollectionUMAP(collectionId, {
          n_components: nComponents,
          n_neighbors: nNeighbors,
          min_dist: minDist,
          metric: metric
        })
        setUmapData(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load UMAP projection"
        setError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadUMAP()
  }, [collectionId, nComponents, nNeighbors, minDist, metric])

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Projecting embeddings...</p>
          <p className="text-xs text-muted-foreground">This may take a moment</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Make sure the Python backend has umap-learn installed
          </p>
        </div>
      </div>
    )
  }

  if (!umapData || umapData.points.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No embedding data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative flex">
      {/* Settings Panel */}
      <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg p-4 border space-y-4 w-64">
        <div className="font-medium text-sm">UMAP Settings</div>

        <div className="space-y-2">
          <Label className="text-xs">Dimensions</Label>
          <Select
            value={nComponents.toString()}
            onValueChange={(value) => setNComponents(parseInt(value) as 2 | 3)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2D</SelectItem>
              <SelectItem value="3">3D</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Neighbors</Label>
            <span className="text-xs text-muted-foreground">{nNeighbors}</span>
          </div>
          <Slider
            value={[nNeighbors]}
            onValueChange={([value]) => setNNeighbors(value)}
            min={5}
            max={50}
            step={5}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Min Distance</Label>
            <span className="text-xs text-muted-foreground">{minDist.toFixed(2)}</span>
          </div>
          <Slider
            value={[minDist * 100]}
            onValueChange={([value]) => setMinDist(value / 100)}
            min={0}
            max={50}
            step={5}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Metric</Label>
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cosine">Cosine</SelectItem>
              <SelectItem value="euclidean">Euclidean</SelectItem>
              <SelectItem value="manhattan">Manhattan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
          <div>Points: {umapData.stats.num_points}</div>
          <div>Projection: {nComponents}D</div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1">
        <Canvas camera={{ position: [0, 0, nComponents === 3 ? 15 : 12], fov: 60 }}>
          <Suspense fallback={null}>
            <UMAPScene umapData={umapData} is3D={nComponents === 3} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}
