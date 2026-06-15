"use client"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useRagDashboard } from "../../rag-dashboard-context"

export function CoreOptionsSection() {
  const {
    settings,
    updateRetrievalSettings,
    extendedRetrieval,
    setExtendedRetrieval,
    backendConfig,
    setBackendConfig,
  } = useRagDashboard()

  return (
    <>
      {/* Top K */}
      <div className="space-y-3 p-5 rounded-xl border bg-card/50">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Top K (Final Results)</Label>
          <Badge variant="secondary" className="tabular-nums">
            {settings.retrieval.topK}
          </Badge>
        </div>
        <Slider
          value={[settings.retrieval.topK]}
          onValueChange={([value]) => updateRetrievalSettings({ topK: value })}
          min={1}
          max={20}
          step={1}
        />
        <p className="text-xs text-muted-foreground">Number of chunks to return after reranking</p>
      </div>

      {/* Minimum Similarity Score */}
      <div className="space-y-3 p-5 rounded-xl border bg-card/50">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Minimum Similarity Score</Label>
          <Badge variant="secondary" className="tabular-nums">
            {(backendConfig.minSimilarityScore * 100).toFixed(0)}%
          </Badge>
        </div>
        <Slider
          value={[backendConfig.minSimilarityScore]}
          onValueChange={([value]) => setBackendConfig({ ...backendConfig, minSimilarityScore: value })}
          min={0}
          max={1}
          step={0.05}
        />
        <p className="text-xs text-muted-foreground">Chunks below this threshold will be filtered out</p>
      </div>

      {/* Core Retrieval Options */}
      <div className="space-y-4 p-5 rounded-xl border bg-card/50">
        <h4 className="text-sm font-medium">Core Options</h4>

        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Hybrid Search</Label>
            <p className="text-xs text-muted-foreground">Combine vector search with BM25 keyword matching</p>
          </div>
          <Switch
            checked={settings.retrieval.hybridSearch}
            onCheckedChange={(checked) => updateRetrievalSettings({ hybridSearch: checked })}
          />
        </div>

        {settings.retrieval.hybridSearch && (
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Hybrid Alpha (Vector Weight)</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{extendedRetrieval.hybridAlpha.toFixed(2)}</span>
            </div>
            <Slider
              value={[extendedRetrieval.hybridAlpha]}
              onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, hybridAlpha: value })}
              min={0}
              max={1}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              Weight for vector search (1-alpha for BM25). Higher = more semantic.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Reranking</Label>
            <p className="text-xs text-muted-foreground">Re-score results with cross-encoder model</p>
          </div>
          <Switch
            checked={settings.retrieval.useReranking}
            onCheckedChange={(checked) => updateRetrievalSettings({ useReranking: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Debug Info</Label>
            <p className="text-xs text-muted-foreground">Display scores, latency, and strategy details</p>
          </div>
          <Switch
            checked={settings.retrieval.showDebugInfo}
            onCheckedChange={(checked) => updateRetrievalSettings({ showDebugInfo: checked })}
          />
        </div>
      </div>
    </>
  )
}
