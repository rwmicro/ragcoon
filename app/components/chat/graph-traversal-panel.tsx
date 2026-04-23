"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  CaretDown,
  CaretRight,
  Graph,
} from "@phosphor-icons/react"
import { useMemo, useState } from "react"

export type TraversalEntity = {
  name: string
  entity_type: string
  mentions: number
  importance: number
  is_seed: boolean
}

export type TraversalEdge = {
  source: string
  target: string
  type: string
  weight: number
}

export type GraphTraversal = {
  seed: TraversalEntity[]
  expanded: TraversalEntity[]
  edges: TraversalEdge[]
  expansion_depth: number
  alpha: number
  totals?: {
    seed_count: number
    expanded_count: number
    edge_count: number
  }
}

type Props = {
  traversal: GraphTraversal
}

const TYPE_COLORS: Record<string, string> = {
  PERSON: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  ORG: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  GPE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  LOC: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  CONCEPT: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  EVENT: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  PRODUCT: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
}

function typeClass(entityType: string): string {
  return (
    TYPE_COLORS[entityType] ||
    "bg-muted/40 text-muted-foreground border-border"
  )
}

function EntityChip({ entity }: { entity: TraversalEntity }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px]",
        typeClass(entity.entity_type)
      )}
      title={`${entity.entity_type} • mentions: ${entity.mentions} • importance: ${entity.importance.toFixed(3)}`}
    >
      <span className="truncate font-medium">{entity.name}</span>
      <span className="text-[9px] opacity-70">{entity.entity_type}</span>
    </div>
  )
}

export function GraphTraversalPanel({ traversal }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const totals = traversal.totals ?? {
    seed_count: traversal.seed.length,
    expanded_count: traversal.expanded.length,
    edge_count: traversal.edges.length,
  }

  const topEdges = useMemo(
    () =>
      [...traversal.edges]
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 8),
    [traversal.edges]
  )

  const hasContent = totals.seed_count > 0 || totals.expanded_count > 0
  if (!hasContent) return null

  return (
    <div className="mt-4 border-t border-border/50 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="mb-3 flex items-center gap-2 hover:bg-muted/50 p-1 -ml-1 rounded-md transition-colors cursor-pointer group/graph"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-1 rounded-md group-hover/graph:bg-muted/50 transition-colors">
          <Graph className="size-3.5" weight="duotone" />
          <span>Graph RAG traversal</span>
        </div>
        <span className="text-[10px] text-muted-foreground/60">
          {totals.seed_count} seed · {totals.expanded_count} expanded · depth {traversal.expansion_depth}
        </span>
        {isOpen ? (
          <CaretDown className="size-3 text-muted-foreground" />
        ) : (
          <CaretRight className="size-3 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {traversal.seed.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  Seed entities
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  extracted from top chunks
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {traversal.seed.map((e) => (
                  <EntityChip key={`seed-${e.name}`} entity={e} />
                ))}
              </div>
            </div>
          )}

          {traversal.expanded.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  Expanded entities
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  reached via graph neighbours (depth {traversal.expansion_depth})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {traversal.expanded.map((e) => (
                  <EntityChip key={`exp-${e.name}`} entity={e} />
                ))}
              </div>
            </div>
          )}

          {topEdges.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  Top relations
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  showing {topEdges.length} of {totals.edge_count}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-md border bg-card/30 p-2">
                {topEdges.map((edge, i) => (
                  <div
                    key={`${edge.source}-${edge.target}-${i}`}
                    className="flex items-center gap-2 text-[11px]"
                  >
                    <span className="truncate font-medium text-foreground/90">
                      {edge.source}
                    </span>
                    <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium text-foreground/90">
                      {edge.target}
                    </span>
                    <span className="ml-auto shrink-0 rounded bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      {edge.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-[10px] text-muted-foreground">
            Alpha {traversal.alpha.toFixed(2)} — vector vs graph score balance.
          </div>
        </div>
      )}
    </div>
  )
}
