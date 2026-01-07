"use client"

import { Badge } from "@/components/ui/badge"
import { convertToMemoryGraphFormatInterconnected } from "@/lib/api/graph-adapter"
import { getCollectionGraph } from "@/lib/api/rag"
import { MemoryGraph } from "@supermemory/memory-graph"
import type { DocumentWithMemories } from "@supermemory/memory-graph"
import { Info, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface GraphNode {
  id: string
  type: "entity" | "chunk"
  entity_type?: string
  label: string
  mentions?: number
  importance?: number
  embedding?: number[]
  content?: string
}

interface GraphEdge {
  source: string
  target: string
  type: string
  weight: number
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: any
}

/**
 * Enhanced Graph Visualization using Memory Graph
 *
 * This replaces the previous Three.js implementation with @supermemory/memory-graph.
 * Memory Graph provides built-in features like:
 * - Interactive pan/zoom
 * - Node selection and details panel
 * - Space/tag filtering
 * - Canvas 2D rendering for better performance
 * - Document-Memory relationship visualization
 */
export function GraphVisualizationEnhanced({
  collectionId,
}: {
  collectionId: string
}) {
  const [documents, setDocuments] = useState<DocumentWithMemories[]>([])
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [selectedSpace, setSelectedSpace] = useState<string>("all")

  useEffect(() => {
    const loadGraph = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getCollectionGraph(collectionId)
        setGraphData(data)

        // Convert backend graph format to Memory Graph format
        const convertedDocuments =
          convertToMemoryGraphFormatInterconnected(data)
        setDocuments(convertedDocuments)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load graph"
        const errorObj = err instanceof Error ? err : new Error(message)
        setError(errorObj)
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadGraph()
  }, [collectionId])

  // Get entity type statistics
  const entityTypeStats = graphData?.nodes
    .filter((n) => n.type === "entity")
    .reduce(
      (acc, node) => {
        const type = node.entity_type || "UNKNOWN"
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

  // Get top entities by importance
  const topEntities = graphData?.stats?.top_entities?.slice(0, 5) || []

  return (
    <div className="relative h-full w-full">
      {/* Enhanced stats overlay with more information */}
      {graphData && (
        <div className="bg-background/90 pointer-events-none absolute top-4 left-4 z-10 max-w-xs space-y-3 rounded-lg border p-4 text-xs shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Info className="size-4" />
            <div className="text-sm font-semibold">Graph Analytics</div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground font-medium">Overview</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-muted-foreground text-[10px]">
                  Entities
                </div>
                <div className="font-semibold">
                  {graphData.stats.num_entities}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-[10px]">Chunks</div>
                <div className="font-semibold">
                  {graphData.stats.num_chunks}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-[10px]">
                  Connections
                </div>
                <div className="font-semibold">{graphData.stats.num_edges}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[10px]">
                  Avg Entities/Chunk
                </div>
                <div className="font-semibold">
                  {graphData.stats.avg_entities_per_chunk?.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {entityTypeStats && Object.keys(entityTypeStats).length > 0 && (
            <div className="space-y-1">
              <div className="text-muted-foreground font-medium">
                Entity Types
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(entityTypeStats).map(([type, count]) => (
                  <Badge
                    key={type}
                    variant="secondary"
                    className="px-1.5 py-0 text-[10px]"
                  >
                    {type}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {topEntities.length > 0 && (
            <div className="space-y-1">
              <div className="text-muted-foreground font-medium">
                Top Entities
              </div>
              <div className="space-y-0.5">
                {topEntities.map((entity: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex-1 truncate">{entity.name}</span>
                    <Badge
                      variant="outline"
                      className="shrink-0 px-1 py-0 text-[9px]"
                    >
                      {entity.mentions}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Memory Graph Component with enhanced features */}
      <MemoryGraph
        documents={documents}
        isLoading={isLoading}
        error={error}
        variant="console"
        showSpacesSelector={true}
        selectedSpace={selectedSpace}
        onSpaceChange={setSelectedSpace}
        highlightsVisible={true}
      >
        {/* Custom empty state */}
        <div className="text-muted-foreground flex h-full flex-col items-center justify-center p-8 text-center">
          <h2 className="mb-2 text-lg font-medium">No graph data available</h2>
          <p className="mb-4 text-sm">
            Try indexing documents with Graph RAG enabled
          </p>
          <div className="space-y-1 text-xs">
            <p>Entity extraction will create nodes</p>
            <p>Relationships will create connections</p>
            <p>Chunks will be organized hierarchically</p>
          </div>
        </div>
      </MemoryGraph>

      {/* Help tooltip */}
      {documents.length > 0 && (
        <div className="bg-background/90 pointer-events-none absolute right-4 bottom-4 z-10 max-w-xs space-y-1 rounded-lg border p-3 text-xs shadow-lg backdrop-blur-sm">
          <div className="font-medium">Interaction Tips</div>
          <ul className="text-muted-foreground list-inside list-disc space-y-0.5">
            <li>Click nodes to view details</li>
            <li>Drag to pan the graph</li>
            <li>Scroll to zoom</li>
            <li>Use space selector to filter</li>
          </ul>
        </div>
      )}
    </div>
  )
}
