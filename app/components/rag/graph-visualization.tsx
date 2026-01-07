"use client"

import { convertToMemoryGraphFormatInterconnected } from "@/lib/api/graph-adapter"
import { getCollectionGraph } from "@/lib/api/rag"
import { MemoryGraph } from "@supermemory/memory-graph"
import type { DocumentWithMemories } from "@supermemory/memory-graph"
import { Loader2 } from "lucide-react"
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
 * Graph Visualization using Memory Graph
 *
 * Replaces the previous Three.js implementation with @supermemory/memory-graph
 * which provides Canvas 2D rendering with better performance for large graphs.
 */
export function GraphVisualization({ collectionId }: { collectionId: string }) {
  const [documents, setDocuments] = useState<DocumentWithMemories[]>([])
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

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

  return (
    <div className="relative h-full w-full">
      {/* Stats overlay */}
      {graphData && (
        <div className="bg-background/80 pointer-events-none absolute top-4 left-4 z-10 space-y-1 rounded-lg border p-3 text-xs backdrop-blur-sm">
          <div className="font-medium">Graph Statistics</div>
          <div className="text-muted-foreground">
            Entities: {graphData.stats.num_entities}
          </div>
          <div className="text-muted-foreground">
            Chunks: {graphData.stats.num_chunks}
          </div>
          <div className="text-muted-foreground">
            Connections: {graphData.stats.num_edges}
          </div>
          <div className="text-muted-foreground">
            Total Nodes: {graphData.nodes.length}
          </div>
        </div>
      )}

      {/* Memory Graph Component */}
      <MemoryGraph
        documents={documents}
        isLoading={isLoading}
        error={error}
        variant="console"
        showSpacesSelector={true}
      >
        {/* Custom empty state */}
        <div className="text-muted-foreground flex h-full flex-col items-center justify-center p-8 text-center">
          <h2 className="mb-2 text-lg font-medium">No graph data available</h2>
          <p className="text-sm">
            Try indexing documents with Graph RAG enabled
          </p>
        </div>
      </MemoryGraph>
    </div>
  )
}
