"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ChartBar,
  ArrowsClockwise,
  CircleNotch,
  TrendUp,
  Clock,
  Database,
  File,
  CheckCircle,
  Warning,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { getRAGStats, getQueryLogs, RAGStats, RAGQueryLog } from "@/lib/api/rag"

interface QueryLog {
  timestamp: number
  query: string
  avgScore: number
  latency: number
  strategy: string
  topK: number
}

interface StatsData {
  totalQueries: number
  queriesToday: number
  queriesThisWeek: number
  avgLatency: number
  avgRetrievalScore: number
  lowConfidenceCount: number
  mostQueriedDocs: Array<{ filename: string; count: number }>
  queriesOverTime: Array<{ date: string; count: number }>
  scoreDistribution: Array<{ range: string; count: number }>
}

interface StatsDashboardProps {
  className?: string
}

export function StatsDashboard({ className }: StatsDashboardProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadStats = async () => {
    setIsLoading(true)
    try {
      // Fetch both corpus stats and query logs
      const [corpusStats, queryLogs] = await Promise.all([
        getRAGStats(),
        getQueryLogs(undefined, 1000).catch(() => []), // Get last 1000 queries, fallback to empty array
      ])

      // Calculate query analytics from logs
      const now = Date.now()
      const oneDayAgo = now - 24 * 60 * 60 * 1000
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

      // Filter queries by time
      const queriesToday = queryLogs.filter(
        log => new Date(log.timestamp).getTime() > oneDayAgo
      )
      const queriesThisWeek = queryLogs.filter(
        log => new Date(log.timestamp).getTime() > oneWeekAgo
      )

      // Calculate average latency
      const avgLatency =
        queryLogs.length > 0
          ? Math.round(
              queryLogs.reduce((sum, log) => sum + log.total_time_ms, 0) /
                queryLogs.length
            )
          : 0

      // Calculate average retrieval score
      const avgRetrievalScore =
        queryLogs.length > 0
          ? queryLogs.reduce((sum, log) => sum + log.avg_score, 0) /
            queryLogs.length
          : 0

      // Count low confidence queries (avg_score < 0.5)
      const lowConfidenceCount = queryLogs.filter(
        log => log.avg_score < 0.5
      ).length

      // Calculate most queried documents
      const docCounts = new Map<string, number>()
      queryLogs.forEach(log => {
        // Extract document references from query or collection
        // For now, we'll group by collection_id as a proxy
        const key = log.collection_id || "unknown"
        docCounts.set(key, (docCounts.get(key) || 0) + 1)
      })
      const mostQueriedDocs = Array.from(docCounts.entries())
        .map(([filename, count]) => ({ filename, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Calculate queries over time (last 7 days)
      const queriesByDate = new Map<string, number>()
      queriesThisWeek.forEach(log => {
        const date = new Date(log.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
        queriesByDate.set(date, (queriesByDate.get(date) || 0) + 1)
      })
      const queriesOverTime = Array.from(queriesByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .slice(-7) // Last 7 days

      // Calculate score distribution
      const scoreRanges = [
        { range: "0-20%", min: 0, max: 0.2, count: 0 },
        { range: "20-40%", min: 0.2, max: 0.4, count: 0 },
        { range: "40-60%", min: 0.4, max: 0.6, count: 0 },
        { range: "60-80%", min: 0.6, max: 0.8, count: 0 },
        { range: "80-100%", min: 0.8, max: 1.0, count: 0 },
      ]
      queryLogs.forEach(log => {
        const range = scoreRanges.find(
          r => log.avg_score >= r.min && log.avg_score < r.max
        )
        if (range) range.count++
      })
      const scoreDistribution = scoreRanges.map(({ range, count }) => ({
        range,
        count,
      }))

      setStats({
        totalQueries: queryLogs.length,
        queriesToday: queriesToday.length,
        queriesThisWeek: queriesThisWeek.length,
        avgLatency,
        avgRetrievalScore,
        lowConfidenceCount,
        mostQueriedDocs,
        queriesOverTime,
        scoreDistribution,
        // Add corpus stats
        ...corpusStats as any,
      })
    } catch (error) {
      console.error("Failed to load stats:", error)
      toast.error("Failed to load statistics")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const StatCard = ({
    icon: Icon,
    label,
    value,
    subtitle,
    trend,
    variant = "default",
  }: {
    icon: any
    label: string
    value: string | number
    subtitle?: string
    trend?: "up" | "down" | "neutral"
    variant?: "default" | "success" | "warning" | "danger"
  }) => {
    const variantColors = {
      default: "bg-muted/30 border-border",
      success: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
      warning: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
      danger: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    }

    return (
      <div className={cn("p-4 rounded-lg border", variantColors[variant])}>
        <div className="flex items-center justify-between mb-2">
          <Icon className="size-5 text-muted-foreground" weight="duotone" />
          {trend && (
            <TrendUp
              className={cn(
                "size-4",
                trend === "up" && "text-green-500",
                trend === "down" && "text-red-500 rotate-180",
                trend === "neutral" && "text-muted-foreground"
              )}
            />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    )
  }

  const SimpleBarChart = ({
    data,
    maxValue,
  }: {
    data: Array<{ label: string; value: number }>
    maxValue: number
  }) => (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium tabular-nums">{item.value}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )

  const SimpleLineChart = ({
    data,
  }: {
    data: Array<{ date: string; count: number }>
  }) => {
    const maxCount = Math.max(...data.map(d => d.count))
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - (d.count / maxCount) * 80 // Leave 20% padding
      return `${x},${y}`
    }).join(" ")

    return (
      <div className="relative h-32 w-full">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" strokeWidth="0.2" opacity="0.2" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.2" opacity="0.2" />
          <line x1="0" y1="80" x2="100" y2="80" stroke="currentColor" strokeWidth="0.2" opacity="0.2" />

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Area fill */}
          <polygon
            points={`0,100 ${points} 100,100`}
            fill="hsl(var(--primary))"
            opacity="0.1"
          />

          {/* Points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = 100 - (d.count / maxCount) * 80
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="2"
                fill="hsl(var(--primary))"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2">
          {data.map((d, i) => (
            <span key={i} className="text-[10px] text-muted-foreground">
              {d.date}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (isLoading || !stats) {
    return (
      <div className={cn("border rounded-lg p-12", className)}>
        <div className="flex flex-col items-center justify-center gap-3">
          <CircleNotch className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChartBar className="size-6" weight="duotone" />
          <h2 className="text-lg font-semibold">RAG Statistics</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={loadStats}>
          <ArrowsClockwise className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Database}
          label="Total Files"
          value={(stats as any).total_files || 0}
          subtitle="Indexed documents"
          trend="neutral"
        />
        <StatCard
          icon={File}
          label="Total Chunks"
          value={(stats as any).total_chunks || 0}
          subtitle="Vector embeddings"
          variant="default"
        />
        <StatCard
          icon={Clock}
          label="Vector Store"
          value={(stats as any).vector_store_type || "ChromaDB"}
          subtitle="Storage backend"
          trend="neutral"
        />
        <StatCard
          icon={CheckCircle}
          label="Embedding Model"
          value={(stats as any).embedding_model || "Unknown"}
          subtitle="Current model"
          variant="success"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queries Over Time */}
        <div className="border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">Queries This Week</h3>
          {stats.queriesOverTime.length > 0 ? (
            <SimpleLineChart data={stats.queriesOverTime} />
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-xs bg-muted/10 rounded-lg border border-dashed">
              No query history available
            </div>
          )}
        </div>

        {/* Score Distribution */}
        <div className="border rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">Score Distribution</h3>
          {stats.scoreDistribution.length > 0 ? (
            <SimpleBarChart
              data={stats.scoreDistribution.map(item => ({
                label: item.range,
                value: item.count,
              }))}
              maxValue={Math.max(...stats.scoreDistribution.map(s => s.count))}
            />
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-xs bg-muted/10 rounded-lg border border-dashed">
              No score data available
            </div>
          )}
        </div>
      </div>

      {/* Most Queried Documents */}
      <div className="border rounded-lg p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <File className="size-4" />
          Most Queried Documents
        </h3>
        {stats.mostQueriedDocs.length > 0 ? (
          <div className="space-y-3">
            {stats.mostQueriedDocs.map((doc, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground w-6">
                  #{i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium truncate">{doc.filename}</p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${(doc.count / stats.mostQueriedDocs[0].count) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <Badge variant="secondary" className="tabular-nums text-xs">
                  {doc.count}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-xs bg-muted/10 rounded-lg border border-dashed">
            No document query stats available
          </div>
        )}
      </div>

      {/* Low Confidence Alert */}
      {stats.lowConfidenceCount > 0 && (
        <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <Warning className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" weight="fill" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {stats.lowConfidenceCount} low confidence queries detected
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                These queries had average source relevance below 50%. Consider reviewing your knowledge base or query strategy.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
