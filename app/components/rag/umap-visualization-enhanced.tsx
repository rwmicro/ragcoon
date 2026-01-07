"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Text, Html } from "@react-three/drei"
import * as THREE from "three"
import { getCollectionUMAP } from "@/lib/api/rag"
import { toast } from "sonner"
import { Loader2, Search, Download, X, Layers } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"

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

interface Cluster {
  id: number
  center: [number, number, number]
  pointIndices: number[]
  color: string
}

// K-means clustering implementation
function kMeansClustering(
  points: Array<{ position: [number, number, number] }>,
  k: number,
  maxIterations: number = 100
): Cluster[] {
  if (points.length < k) k = Math.max(1, points.length)

  // Initialize centroids randomly
  const centroids: Array<[number, number, number]> = []
  const usedIndices = new Set<number>()

  for (let i = 0; i < k; i++) {
    let randomIndex: number
    do {
      randomIndex = Math.floor(Math.random() * points.length)
    } while (usedIndices.has(randomIndex))
    usedIndices.add(randomIndex)
    centroids.push([...points[randomIndex].position])
  }

  // K-means iterations
  let assignments = new Array(points.length).fill(0)

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign points to nearest centroid
    const newAssignments = points.map((point, idx) => {
      let minDist = Infinity
      let closestCentroid = 0

      centroids.forEach((centroid, cIdx) => {
        const dx = point.position[0] - centroid[0]
        const dy = point.position[1] - centroid[1]
        const dz = point.position[2] - centroid[2]
        const dist = dx * dx + dy * dy + dz * dz

        if (dist < minDist) {
          minDist = dist
          closestCentroid = cIdx
        }
      })

      return closestCentroid
    })

    // Check convergence
    if (JSON.stringify(assignments) === JSON.stringify(newAssignments)) {
      break
    }

    assignments = newAssignments

    // Update centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = points.filter((_, idx) => assignments[idx] === c)

      if (clusterPoints.length > 0) {
        const sumX = clusterPoints.reduce((sum, p) => sum + p.position[0], 0)
        const sumY = clusterPoints.reduce((sum, p) => sum + p.position[1], 0)
        const sumZ = clusterPoints.reduce((sum, p) => sum + p.position[2], 0)
        centroids[c] = [
          sumX / clusterPoints.length,
          sumY / clusterPoints.length,
          sumZ / clusterPoints.length
        ]
      }
    }
  }

  // Create clusters
  const clusterColors = [
    "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa",
    "#06b6d4", "#f87171", "#fb923c", "#4ade80", "#818cf8"
  ]

  return centroids.map((center, idx) => ({
    id: idx,
    center,
    pointIndices: assignments.map((a, i) => a === idx ? i : -1).filter(i => i >= 0),
    color: clusterColors[idx % clusterColors.length]
  }))
}

// Cluster boundary component
function ClusterBoundary({ cluster, points, is3D }: {
  cluster: Cluster
  points: Array<UMAPPoint & { position: [number, number, number], color: string }>
  is3D: boolean
}) {
  const clusterPoints = cluster.pointIndices.map(idx => points[idx].position)

  if (clusterPoints.length === 0) return null

  // Create convex hull approximation (simple bounding sphere for now)
  const center = cluster.center
  let maxRadius = 0

  clusterPoints.forEach(point => {
    const dx = point[0] - center[0]
    const dy = point[1] - center[1]
    const dz = is3D ? point[2] - center[2] : 0
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (dist > maxRadius) maxRadius = dist
  })

  return (
    <mesh position={center}>
      {is3D ? (
        <sphereGeometry args={[maxRadius + 0.3, 32, 32]} />
      ) : (
        <cylinderGeometry args={[maxRadius + 0.3, maxRadius + 0.3, 0.1, 32]} />
      )}
      <meshBasicMaterial
        color={cluster.color}
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Export canvas as image
function useCanvasExport() {
  const { gl } = useThree()

  const exportPNG = () => {
    const canvas = gl.domElement
    const link = document.createElement('a')
    link.download = `umap-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.success("UMAP exported as PNG")
  }

  return { exportPNG }
}

// Point component for 2D/3D visualization
function Point({
  point,
  isHovered,
  isSelected,
  onPointerOver,
  onPointerOut,
  onClick,
  is3D
}: {
  point: UMAPPoint & { position: [number, number, number], color: string, visible: boolean }
  isHovered: boolean
  isSelected: boolean
  onPointerOver: () => void
  onPointerOut: () => void
  onClick: () => void
  is3D: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (isSelected) {
      setScale(3)
    } else if (isHovered) {
      setScale(2.5)
    } else {
      setScale(1)
    }
  }, [isHovered, isSelected])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scale)
    }
  })

  if (!point.visible) return null

  return (
    <group position={point.position}>
      <mesh
        ref={meshRef}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          color={point.color}
          emissive={point.color}
          emissiveIntensity={isSelected ? 1 : isHovered ? 0.8 : 0.3}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
      {(isHovered || isSelected) && (
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
      {isSelected && (
        <Html position={[0, -0.3, 0]} center>
          <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-3 text-xs whitespace-nowrap shadow-lg max-w-xs">
            <div className="font-medium mb-1">{point.metadata.file_name}</div>
            <div className="text-muted-foreground">
              {point.label.substring(0, 150)}...
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

// UMAP scene component
function UMAPScene({
  umapData,
  is3D,
  searchQuery,
  showClusters,
  numClusters,
  selectedPointIndex,
  onPointClick
}: {
  umapData: UMAPData
  is3D: boolean
  searchQuery: string
  showClusters: boolean
  numClusters: number
  selectedPointIndex: number | null
  onPointClick: (index: number) => void
}) {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null)
  const [points, setPoints] = useState<Array<UMAPPoint & { position: [number, number, number], color: string, visible: boolean }>>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const { exportPNG } = useCanvasExport()

  // Initialize points
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

    // Color points by source file initially
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
        color: fileColors.get(fileName) || "#9ca3af",
        visible: true
      }
    })

    setPoints(processedPoints)
  }, [umapData, is3D])

  // Compute clusters
  useEffect(() => {
    if (!showClusters || points.length === 0) {
      setClusters([])
      return
    }

    const computedClusters = kMeansClustering(points, numClusters)
    setClusters(computedClusters)

    // Update point colors based on clusters
    setPoints(prev => prev.map((point, idx) => {
      const clusterIdx = computedClusters.findIndex(c => c.pointIndices.includes(idx))
      return {
        ...point,
        color: clusterIdx >= 0 ? computedClusters[clusterIdx].color : point.color
      }
    }))
  }, [showClusters, numClusters, points.length])

  // Apply search filter
  useEffect(() => {
    if (!searchQuery) {
      setPoints(prev => prev.map(p => ({ ...p, visible: true })))
      return
    }

    setPoints(prev => prev.map(point => ({
      ...point,
      visible: point.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
               point.metadata.file_name.toLowerCase().includes(searchQuery.toLowerCase())
    })))
  }, [searchQuery])

  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.4} />

      {/* Cluster boundaries */}
      {showClusters && clusters.map(cluster => (
        <ClusterBoundary
          key={cluster.id}
          cluster={cluster}
          points={points}
          is3D={is3D}
        />
      ))}

      {/* Points */}
      {points.map((point, i) => (
        <Point
          key={i}
          point={point}
          isHovered={hoveredPointIndex === i}
          isSelected={selectedPointIndex === i}
          onPointerOver={() => setHoveredPointIndex(i)}
          onPointerOut={() => setHoveredPointIndex(null)}
          onClick={() => onPointClick(i)}
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
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)

  // Settings
  const [nComponents, setNComponents] = useState<2 | 3>(2)
  const [nNeighbors, setNNeighbors] = useState(15)
  const [minDist, setMinDist] = useState(0.1)
  const [metric, setMetric] = useState("cosine")

  // Clustering
  const [showClusters, setShowClusters] = useState(false)
  const [numClusters, setNumClusters] = useState(5)

  const canvasRef = useRef<HTMLDivElement>(null)

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

  const handleExportPNG = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current.querySelector('canvas')
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `umap-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.success("UMAP exported as PNG")
  }

  const handlePointClick = (index: number) => {
    setSelectedPointIndex(prev => prev === index ? null : index)
  }

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
    <div className="w-full h-full relative flex" ref={canvasRef}>
      {/* Settings Panel */}
      <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg p-4 border space-y-4 w-72 max-h-[calc(100%-2rem)] overflow-y-auto">
        <div className="font-medium text-sm">UMAP Settings</div>

        {/* Search */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <Input
              placeholder="Search points..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setSearchQuery("")}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* UMAP Parameters */}
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

        <div className="h-px bg-border" />

        {/* Clustering */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="size-4" />
              <Label htmlFor="show-clusters" className="text-xs font-medium cursor-pointer">
                Show Clusters
              </Label>
            </div>
            <Switch
              id="show-clusters"
              checked={showClusters}
              onCheckedChange={setShowClusters}
            />
          </div>

          {showClusters && (
            <div className="space-y-2 pl-6 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Number of Clusters</Label>
                <span className="text-xs text-muted-foreground">{numClusters}</span>
              </div>
              <Slider
                value={[numClusters]}
                onValueChange={([value]) => setNumClusters(value)}
                min={2}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={handleExportPNG}
        >
          <Download className="size-3 mr-2" />
          Export PNG
        </Button>

        <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
          <div>Points: {umapData.stats.num_points}</div>
          <div>Projection: {nComponents}D</div>
          {showClusters && <div>Clusters: {numClusters}</div>}
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1">
        <Canvas camera={{ position: [0, 0, nComponents === 3 ? 15 : 12], fov: 60 }}>
          <Suspense fallback={null}>
            <UMAPScene
              umapData={umapData}
              is3D={nComponents === 3}
              searchQuery={searchQuery}
              showClusters={showClusters}
              numClusters={numClusters}
              selectedPointIndex={selectedPointIndex}
              onPointClick={handlePointClick}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}
