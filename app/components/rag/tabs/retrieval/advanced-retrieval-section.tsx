"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { GearSix, CaretDown } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useRagDashboard } from "../../rag-dashboard-context"

export function AdvancedRetrievalSection() {
  const {
    extendedRetrieval,
    setExtendedRetrieval,
    advancedRetrievalOpen,
    setAdvancedRetrievalOpen,
  } = useRagDashboard()

  return (
    <Collapsible open={advancedRetrievalOpen} onOpenChange={setAdvancedRetrievalOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <GearSix className="size-4" />
            Advanced Retrieval Options
          </span>
          <CaretDown
            className={cn(
              "size-4 transition-transform",
              advancedRetrievalOpen && "transform rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 mt-4">
        {/* Two-Stage Retrieval */}
        <div className="space-y-4 p-5 rounded-xl border bg-card/50">
          <h4 className="text-sm font-medium">Two-Stage Retrieval</h4>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Initial Retrieval K</Label>
              <Badge variant="secondary" className="tabular-nums text-[10px]">
                {extendedRetrieval.initialRetrievalK}
              </Badge>
            </div>
            <Slider
              value={[extendedRetrieval.initialRetrievalK]}
              onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, initialRetrievalK: value })}
              min={10}
              max={200}
              step={10}
            />
            <p className="text-xs text-muted-foreground">Initial candidates before reranking</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Reranker Top K</Label>
              <Badge variant="secondary" className="tabular-nums text-[10px]">
                {extendedRetrieval.rerankerTopK}
              </Badge>
            </div>
            <Slider
              value={[extendedRetrieval.rerankerTopK]}
              onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, rerankerTopK: value })}
              min={5}
              max={50}
              step={5}
            />
            <p className="text-xs text-muted-foreground">How many to keep after reranking</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Dedup Similarity Threshold</Label>
              <Badge variant="secondary" className="tabular-nums text-[10px]">
                {(extendedRetrieval.dedupSimilarityThreshold * 100).toFixed(0)}%
              </Badge>
            </div>
            <Slider
              value={[extendedRetrieval.dedupSimilarityThreshold]}
              onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, dedupSimilarityThreshold: value })}
              min={0.7}
              max={1}
              step={0.05}
            />
            <p className="text-xs text-muted-foreground">Cosine similarity threshold for deduplication</p>
          </div>
        </div>

        {/* Score Normalization */}
        <div className="space-y-4 p-5 rounded-xl border bg-card/50">
          <h4 className="text-sm font-medium">Score Normalization</h4>

          <div className="space-y-2">
            <Label className="text-xs">Method</Label>
            <Select
              value={extendedRetrieval.scoreNormalizationMethod}
              onValueChange={(value: "minmax" | "zscore" | "rrf") =>
                setExtendedRetrieval({ ...extendedRetrieval, scoreNormalizationMethod: value })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minmax">MinMax (scale to [0,1])</SelectItem>
                <SelectItem value="zscore">Z-Score (standardize)</SelectItem>
                <SelectItem value="rrf">RRF (Reciprocal Rank Fusion)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {extendedRetrieval.scoreNormalizationMethod === "rrf" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs">RRF K Constant</Label>
                <Badge variant="secondary" className="tabular-nums text-[10px]">
                  {extendedRetrieval.rrfK}
                </Badge>
              </div>
              <Slider
                value={[extendedRetrieval.rrfK]}
                onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, rrfK: value })}
                min={1}
                max={100}
                step={1}
              />
              <p className="text-xs text-muted-foreground">Constant for RRF formula (default: 60)</p>
            </div>
          )}
        </div>

        {/* Context Compression Advanced */}
        <div className="space-y-4 p-5 rounded-xl border bg-card/50">
          <h4 className="text-sm font-medium">Context Compression</h4>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Max Context Tokens</Label>
              <Badge variant="secondary" className="tabular-nums text-[10px]">
                {extendedRetrieval.maxContextTokens}
              </Badge>
            </div>
            <Slider
              value={[extendedRetrieval.maxContextTokens]}
              onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, maxContextTokens: value })}
              min={1000}
              max={8000}
              step={500}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Compression Ratio</Label>
              <Badge variant="secondary" className="tabular-nums text-[10px]">
                {(extendedRetrieval.compressionRatio * 100).toFixed(0)}%
              </Badge>
            </div>
            <Slider
              value={[extendedRetrieval.compressionRatio]}
              onValueChange={([value]) => setExtendedRetrieval({ ...extendedRetrieval, compressionRatio: value })}
              min={0.3}
              max={1}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">Percentage of context to keep</p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
