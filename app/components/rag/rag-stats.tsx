"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CircleNotch, FileText, Database, Trash } from "@phosphor-icons/react"
import { toast } from "sonner"

interface RAGStats {
  totalChunks: number
  files: Array<{
    filename: string
    chunkCount: number
  }>
}

export function RAGStats() {
  const [stats, setStats] = useState<RAGStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/rag/ingest")

      if (!response.ok) {
        throw new Error("Failed to fetch stats")
      }

      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      console.error("Error fetching RAG stats:", error)
      toast.error("Failed to load RAG statistics")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2">
          <CircleNotch className="animate-spin" size={20} />
          <span>Loading statistics...</span>
        </div>
      </Card>
    )
  }

  if (!stats || stats.totalChunks === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Database size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="mb-2 text-lg font-semibold">No RAG Knowledge Base</h3>
          <p className="text-muted-foreground text-sm">
            Create your first RAG knowledge base by clicking "Create RAG" in the
            sidebar
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overview */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">RAG Overview</h3>
          <Button variant="ghost" size="sm" onClick={fetchStats}>
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted rounded-lg p-4">
            <div className="text-muted-foreground mb-1 text-sm">Total Chunks</div>
            <div className="text-2xl font-bold">{stats.totalChunks}</div>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <div className="text-muted-foreground mb-1 text-sm">
              Indexed Files
            </div>
            <div className="text-2xl font-bold">{stats.files.length}</div>
          </div>
        </div>
      </Card>

      {/* Files List */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Indexed Files</h3>

        <div className="space-y-2">
          {stats.files.map((file) => (
            <div
              key={file.filename}
              className="flex items-center justify-between rounded-lg bg-muted p-3"
            >
              <div className="flex items-center gap-2">
                <FileText size={20} />
                <div>
                  <div className="text-sm font-medium">{file.filename}</div>
                  <div className="text-muted-foreground text-xs">
                    {file.chunkCount} chunks
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
