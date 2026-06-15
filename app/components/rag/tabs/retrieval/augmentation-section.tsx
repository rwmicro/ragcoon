"use client"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Graph, Stack, TrendUp } from "@phosphor-icons/react"
import { useRagDashboard } from "../../rag-dashboard-context"
import { RetrievalFeatureCard } from "./retrieval-feature-card"

export function AugmentationSection() {
  const {
    aiSettings,
    setEnableGraphRAG,
    setGraphExpansionDepth,
    setGraphAlpha,
    setEnableMMR,
    setMmrLambda,
    setEnableMultiHop,
    setMaxHops,
  } = useRagDashboard()

  return (
    <>
      {/* Graph RAG */}
      <RetrievalFeatureCard
        id="enableGraphRAG"
        icon={Graph}
        iconClassName="bg-indigo-500/10 text-indigo-500"
        title="Graph RAG"
        tooltip="Expands retrieval through entity/relation graph for connected knowledge."
        subtitle="Graph-augmented retrieval"
        checked={aiSettings.enableGraphRAG}
        onCheckedChange={setEnableGraphRAG}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Expansion Depth</Label>
            <span className="text-xs text-muted-foreground tabular-nums">{aiSettings.graphExpansionDepth}</span>
          </div>
          <Slider
            value={[aiSettings.graphExpansionDepth]}
            onValueChange={([value]) => setGraphExpansionDepth(value)}
            min={1}
            max={3}
            step={1}
          />
          <p className="text-xs text-muted-foreground">Hops to traverse in the graph</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Graph Alpha</Label>
            <span className="text-xs text-muted-foreground tabular-nums">{aiSettings.graphAlpha.toFixed(2)}</span>
          </div>
          <Slider
            value={[aiSettings.graphAlpha]}
            onValueChange={([value]) => setGraphAlpha(value)}
            min={0}
            max={1}
            step={0.05}
          />
          <p className="text-xs text-muted-foreground">Weight of vector vs graph scores (higher = more vector)</p>
        </div>
      </RetrievalFeatureCard>

      {/* MMR Diversity */}
      <RetrievalFeatureCard
        id="enableMMR"
        icon={Stack}
        iconClassName="bg-amber-500/10 text-amber-500"
        title="MMR Diversity"
        tooltip="Maximal Marginal Relevance — reduces redundancy across retrieved chunks."
        subtitle="Penalize near-duplicate chunks"
        checked={aiSettings.enableMMR}
        onCheckedChange={setEnableMMR}
      >
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Lambda</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{aiSettings.mmrLambda.toFixed(2)}</span>
        </div>
        <Slider
          value={[aiSettings.mmrLambda]}
          onValueChange={([value]) => setMmrLambda(value)}
          min={0}
          max={1}
          step={0.05}
        />
        <p className="text-xs text-muted-foreground">1 = relevance only, 0 = diversity only</p>
      </RetrievalFeatureCard>

      {/* Multi-Hop */}
      <RetrievalFeatureCard
        id="enableMultiHop"
        icon={TrendUp}
        iconClassName="bg-rose-500/10 text-rose-500"
        title="Multi-Hop"
        tooltip="Chains multiple retrieval rounds for complex, multi-step questions."
        subtitle="Iterative reasoning retrieval"
        checked={aiSettings.enableMultiHop}
        onCheckedChange={setEnableMultiHop}
      >
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Max Hops</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{aiSettings.maxHops}</span>
        </div>
        <Slider
          value={[aiSettings.maxHops]}
          onValueChange={([value]) => setMaxHops(value)}
          min={1}
          max={5}
          step={1}
        />
        <p className="text-xs text-muted-foreground">Upper bound on reasoning rounds</p>
      </RetrievalFeatureCard>
    </>
  )
}
