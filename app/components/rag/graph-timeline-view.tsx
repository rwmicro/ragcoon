"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { getCollectionGraph } from "@/lib/api/rag"
import {
  Calendar,
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { GraphVisualizationEnhanced as GraphVisualization } from "./graph-visualization-enhanced"

interface GraphNode {
  id: string
  type: "entity" | "chunk"
  entity_type?: string
  label: string
  mentions?: number
  importance?: number
  embedding?: number[]
  content?: string
  timestamp?: string
}

interface GraphEdge {
  source: string
  target: string
  type: string
  weight: number
  timestamp?: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: any
}

interface TimelineSnapshot {
  timestamp: Date
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: any
}

export function GraphTimelineView({ collectionId }: { collectionId: string }) {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Timeline state
  const [snapshots, setSnapshots] = useState<TimelineSnapshot[]>([])
  const [currentSnapshotIndex, setCurrentSnapshotIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1000) // ms per frame
  const [granularity, setGranularity] = useState<"day" | "week" | "month">(
    "week"
  )

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const loadGraph = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getCollectionGraph(collectionId)
        setGraphData(data)

        // Generate timeline snapshots
        generateTimeline(data)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load graph"
        setError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadGraph()
  }, [collectionId])

  // Generate timeline snapshots
  const generateTimeline = (data: GraphData) => {
    // Extract timestamps from nodes and edges
    const timestamps = new Set<number>()

    // For demo purposes, generate synthetic timestamps if not available
    // In production, these would come from actual document ingestion dates
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const weekMs = 7 * dayMs
    const monthMs = 30 * dayMs

    // Assign timestamps to nodes (simulated)
    const nodesWithTimestamps = data.nodes.map((node, idx) => {
      const daysAgo = Math.floor((idx / data.nodes.length) * 90) // Spread over 90 days
      const timestamp = new Date(now - daysAgo * dayMs).toISOString()
      timestamps.add(now - daysAgo * dayMs)
      return { ...node, timestamp }
    })

    // Assign timestamps to edges
    const edgesWithTimestamps = data.edges.map((edge) => {
      const sourceNode = nodesWithTimestamps.find((n) => n.id === edge.source)
      const targetNode = nodesWithTimestamps.find((n) => n.id === edge.target)
      // Edge appears when both nodes exist
      const timestamp =
        sourceNode && targetNode
          ? new Date(
              Math.max(
                new Date(sourceNode.timestamp!).getTime(),
                new Date(targetNode.timestamp!).getTime()
              )
            ).toISOString()
          : new Date().toISOString()

      return { ...edge, timestamp }
    })

    // Sort timestamps
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b)

    // Group by granularity
    const granularityMs =
      granularity === "day" ? dayMs : granularity === "week" ? weekMs : monthMs
    const groupedTimestamps: number[] = []
    let currentGroup = sortedTimestamps[0]
    groupedTimestamps.push(currentGroup)

    for (const ts of sortedTimestamps) {
      if (ts - currentGroup >= granularityMs) {
        currentGroup = ts
        groupedTimestamps.push(currentGroup)
      }
    }

    // Create snapshots
    const newSnapshots: TimelineSnapshot[] = groupedTimestamps.map((ts) => {
      const cutoffDate = new Date(ts)

      const visibleNodes = nodesWithTimestamps.filter(
        (node) => new Date(node.timestamp!) <= cutoffDate
      )

      const visibleNodeIds = new Set(visibleNodes.map((n) => n.id))
      const visibleEdges = edgesWithTimestamps.filter(
        (edge) =>
          new Date(edge.timestamp!) <= cutoffDate &&
          visibleNodeIds.has(edge.source) &&
          visibleNodeIds.has(edge.target)
      )

      return {
        timestamp: cutoffDate,
        nodes: visibleNodes,
        edges: visibleEdges,
        stats: {
          num_entities: visibleNodes.filter((n) => n.type === "entity").length,
          num_chunks: visibleNodes.filter((n) => n.type === "chunk").length,
          num_edges: visibleEdges.length,
        },
      }
    })

    setSnapshots(newSnapshots)
    setCurrentSnapshotIndex(newSnapshots.length - 1) // Start at the end
  }

  // Playback control
  useEffect(() => {
    if (isPlaying && snapshots.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentSnapshotIndex((prev) => {
          if (prev >= snapshots.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, playbackSpeed)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, snapshots, playbackSpeed])

  // Regenerate timeline when granularity changes
  useEffect(() => {
    if (graphData) {
      generateTimeline(graphData)
    }
  }, [granularity])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setCurrentSnapshotIndex(0)
    setIsPlaying(false)
  }

  const handleSkipToEnd = () => {
    setCurrentSnapshotIndex(snapshots.length - 1)
    setIsPlaying(false)
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Loading timeline...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground text-center">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground text-center">
          <p className="text-sm">No graph data available</p>
        </div>
      </div>
    )
  }

  const currentSnapshot = snapshots[currentSnapshotIndex]

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Timeline Controls */}
      <div className="bg-muted/10 shrink-0 space-y-4 border-b px-6 py-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={handleReset}
              disabled={currentSnapshotIndex === 0}
            >
              <SkipBack className="size-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={handleSkipToEnd}
              disabled={currentSnapshotIndex === snapshots.length - 1}
            >
              <SkipForward className="size-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-2">
            <Slider
              value={[currentSnapshotIndex]}
              onValueChange={([value]) => {
                setCurrentSnapshotIndex(value)
                setIsPlaying(false)
              }}
              min={0}
              max={Math.max(0, snapshots.length - 1)}
              step={1}
              className="w-full"
            />
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>
                {currentSnapshot &&
                  currentSnapshot.timestamp.toLocaleDateString()}
              </span>
              <span>
                Frame {currentSnapshotIndex + 1} / {snapshots.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Granularity:</Label>
            <Select
              value={granularity}
              onValueChange={(v) => setGranularity(v as any)}
            >
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Speed:</Label>
            <Select
              value={playbackSpeed.toString()}
              onValueChange={(v) => setPlaybackSpeed(parseInt(v))}
            >
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2000">0.5x</SelectItem>
                <SelectItem value="1000">1x</SelectItem>
                <SelectItem value="500">2x</SelectItem>
                <SelectItem value="250">4x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        {currentSnapshot && (
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-xs">
              <Calendar className="mr-1 size-3" />
              {currentSnapshot.timestamp.toLocaleDateString()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Entities: {currentSnapshot.stats.num_entities}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Chunks: {currentSnapshot.stats.num_chunks}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Connections: {currentSnapshot.stats.num_edges}
            </Badge>
          </div>
        )}
      </div>

      {/* Graph Visualization */}
      <div className="min-h-0 flex-1">
        {currentSnapshot && (
          <div className="h-full w-full">
            {/* Render simplified graph for current snapshot */}
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/5 to-purple-500/5">
              <div className="text-muted-foreground max-w-md text-center">
                <Calendar className="mx-auto mb-4 size-12 opacity-20" />
                <p className="mb-2 text-sm">Timeline Snapshot</p>
                <p className="text-xs opacity-70">
                  Showing graph state as of{" "}
                  {currentSnapshot.timestamp.toLocaleDateString()}
                </p>
                <p className="mt-4 text-xs">
                  This view shows how your knowledge graph evolved over time
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
