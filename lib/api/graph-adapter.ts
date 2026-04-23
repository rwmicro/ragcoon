/**
 * Adapter to convert RAG backend graph data to Memory Graph format
 *
 * Backend format:
 * - nodes: Array<{id, type: "entity" | "chunk", entity_type?, label, mentions?, importance?, content?}>
 * - edges: Array<{source, target, type, weight}>
 *
 * Memory Graph format:
 * - documents: Array<DocumentWithMemories>
 * - Each document can have memoryEntries
 */

import type {
  DocumentWithMemories,
  MemoryEntry,
} from "@supermemory/memory-graph"

interface BackendGraphNode {
  id: string
  type: "entity" | "chunk"
  entity_type?: string
  label: string
  mentions?: number
  importance?: number
  embedding?: number[]
  content?: string
}

interface BackendGraphEdge {
  source: string
  target: string
  type: string
  weight: number
}

interface BackendGraphData {
  nodes: BackendGraphNode[]
  edges: BackendGraphEdge[]
  stats: any
}

/**
 * All nodes as documents with relationships as memories
 * Produces a fully interconnected graph
 */
export function convertToMemoryGraphFormatInterconnected(
  backendData: BackendGraphData
): DocumentWithMemories[] {
  const { nodes, edges } = backendData

  // Build adjacency list for all connections
  const nodeConnections = new Map<
    string,
    Array<{ nodeId: string; weight: number; edgeType: string }>
  >()
  edges.forEach((edge) => {
    // Add forward connection
    const forward = nodeConnections.get(edge.source) || []
    forward.push({
      nodeId: edge.target,
      weight: edge.weight,
      edgeType: edge.type,
    })
    nodeConnections.set(edge.source, forward)

    // Add reverse connection
    const reverse = nodeConnections.get(edge.target) || []
    reverse.push({
      nodeId: edge.source,
      weight: edge.weight,
      edgeType: edge.type,
    })
    nodeConnections.set(edge.target, reverse)
  })

  // Node lookup
  const nodeMap = new Map<string, BackendGraphNode>()
  nodes.forEach((node) => {
    nodeMap.set(node.id, node)
  })

  // Convert all nodes to documents
  const documents: DocumentWithMemories[] = nodes.map((node, index) => {
    const connections = nodeConnections.get(node.id) || []

    // Convert connected nodes to memory entries
    const memoryEntries: MemoryEntry[] = connections
      .map((conn) => {
        const connectedNode = nodeMap.get(conn.nodeId)
        if (!connectedNode) return null

        return {
          id: `${node.id}-${conn.nodeId}`,
          customId: `${node.id}-${conn.nodeId}`,
          documentId: node.id,
          content: connectedNode.label,
          summary: `Connected via ${conn.edgeType}`,
          title: connectedNode.label,
          type: connectedNode.entity_type || connectedNode.type,
          metadata: {
            connection_type: conn.edgeType,
            weight: conn.weight,
            target_node_type: connectedNode.type,
            target_entity_type: connectedNode.entity_type || null,
          },
          embedding: connectedNode.embedding || null,
          embeddingModel: null,
          tokenCount: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          sourceAddedAt: null,
          sourceRelevanceScore: conn.weight,
          sourceMetadata: null,
          spaceContainerTag: conn.edgeType,
          updatesMemoryId: null,
          nextVersionId: null,
          relation: null,
          isForgotten: false,
          forgetAfter: null,
          isLatest: true,
          spaceId: connectedNode.entity_type || connectedNode.type,
        } as MemoryEntry
      })
      .filter(Boolean) as MemoryEntry[]

    // Create document
    return {
      id: node.id,
      customId: node.id,
      contentHash: null,
      orgId: "default",
      userId: "default",
      connectionId: null,
      title: node.label,
      content: node.content || node.label,
      summary: node.label,
      url: null,
      source: "rag-graph",
      type: node.type,
      status: "done" as const,
      metadata: {
        node_type: node.type,
        entity_type: node.entity_type || null,
        mentions: node.mentions || null,
        importance: node.importance || null,
        index: index,
      },
      processingMetadata: null,
      raw: node.content || null,
      tokenCount: null,
      wordCount: null,
      chunkCount: 1,
      averageChunkSize: node.content?.length || null,
      summaryEmbedding: node.embedding || null,
      summaryEmbeddingModel: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      memoryEntries,
    } as DocumentWithMemories
  })

  return documents
}
