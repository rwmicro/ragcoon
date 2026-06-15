"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { TabsContent } from "@/components/ui/tabs"
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
import { EmbeddingModelSelector } from "../embedding-model-selector"
import { useRagDashboard } from "../rag-dashboard-context"

export function IngestionTab() {
  const {
    settings,
    updateIngestionSettings,
    extendedIngestion,
    setExtendedIngestion,
    advancedIngestionOpen,
    setAdvancedIngestionOpen,
  } = useRagDashboard()

  return (
    <TabsContent value="ingestion" className="space-y-6 mt-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Ingestion Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configuration for document processing and indexing
        </p>
      </div>

      <div className="grid gap-6">
        {/* Embedding Model */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <EmbeddingModelSelector
            value={settings.ingestion.embeddingModel}
            onChange={(value) => updateIngestionSettings({ embeddingModel: value })}
          />
        </div>

        {/* Embedding Provider */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <Label className="text-sm font-medium">Embedding Provider</Label>
          <Select
            value={extendedIngestion.embeddingProvider}
            onValueChange={(value: "ollama" | "huggingface" | "auto") =>
              setExtendedIngestion({ ...extendedIngestion, embeddingProvider: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (detect from model name)</SelectItem>
              <SelectItem value="huggingface">HuggingFace</SelectItem>
              <SelectItem value="ollama">Ollama</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Provider for embedding model inference
          </p>
        </div>

        {/* Reranker Model */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <Label className="text-sm font-medium">Reranker Model</Label>
          <Select
            value={extendedIngestion.rerankerModel}
            onValueChange={(value) => setExtendedIngestion({ ...extendedIngestion, rerankerModel: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BAAI/bge-reranker-large">BAAI BGE Reranker Large (560M)</SelectItem>
              <SelectItem value="BAAI/bge-reranker-base">BAAI BGE Reranker Base (278M)</SelectItem>
              <SelectItem value="BAAI/bge-reranker-v2-m3">BAAI BGE Reranker v2 M3 (568M)</SelectItem>
              <SelectItem value="cross-encoder/ms-marco-MiniLM-L-6-v2">MS MARCO MiniLM L6 (Small, 80M)</SelectItem>
              <SelectItem value="cross-encoder/ms-marco-MiniLM-L-12-v2">MS MARCO MiniLM L12 (Medium, 134M)</SelectItem>
              <SelectItem value="jinaai/jina-reranker-v1-base-en">Jina Reranker v1 Base (137M)</SelectItem>
              <SelectItem value="jinaai/jina-reranker-v1-turbo-en">Jina Reranker v1 Turbo (38M)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Cross-encoder model for reranking retrieved chunks
          </p>
        </div>

        {/* Chunk Size */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Target Chunk Size (tokens)</Label>
            <Badge variant="secondary" className="tabular-nums">
              {settings.ingestion.chunkSize}
            </Badge>
          </div>
          <Slider
            value={[settings.ingestion.chunkSize]}
            onValueChange={([value]) => updateIngestionSettings({ chunkSize: value })}
            min={200}
            max={2000}
            step={100}
          />
          <p className="text-xs text-muted-foreground">Target chunk size in tokens</p>
        </div>

        {/* Min/Max Chunk Size */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3 p-5 rounded-xl border bg-card/50">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Min Chunk Size</Label>
              <Badge variant="secondary" className="tabular-nums text-[10px]">
                {extendedIngestion.minChunkSize}
              </Badge>
            </div>
            <Slider
              value={[extendedIngestion.minChunkSize]}
              onValueChange={([value]) => setExtendedIngestion({ ...extendedIngestion, minChunkSize: value })}
              min={50}
              max={500}
              step={50}
            />
          </div>

          <div className="space-y-3 p-5 rounded-xl border bg-card/50">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Max Chunk Size</Label>
              <Badge variant="secondary" className="tabular-nums text-[10px]">
                {extendedIngestion.maxChunkSize}
              </Badge>
            </div>
            <Slider
              value={[extendedIngestion.maxChunkSize]}
              onValueChange={([value]) => setExtendedIngestion({ ...extendedIngestion, maxChunkSize: value })}
              min={1000}
              max={4000}
              step={500}
            />
          </div>
        </div>

        {/* Chunk Overlap */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Chunk Overlap</Label>
            <Badge variant="secondary" className="tabular-nums">
              {settings.ingestion.chunkOverlap}
            </Badge>
          </div>
          <Slider
            value={[settings.ingestion.chunkOverlap]}
            onValueChange={([value]) => updateIngestionSettings({ chunkOverlap: value })}
            min={0}
            max={500}
            step={50}
          />
          <p className="text-xs text-muted-foreground">Overlap between consecutive chunks</p>
        </div>

        {/* Advanced Ingestion Options */}
        <Collapsible open={advancedIngestionOpen} onOpenChange={setAdvancedIngestionOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <GearSix className="size-4" />
                Advanced Ingestion Options
              </span>
              <CaretDown
                className={cn(
                  "size-4 transition-transform",
                  advancedIngestionOpen && "transform rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4 mt-4">
            <div className="space-y-4 p-5 rounded-xl border bg-card/50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Ollama Embedding</Label>
                  <p className="text-xs text-muted-foreground">Use Ollama for embeddings</p>
                </div>
                <Switch
                  checked={settings.ingestion.useOllamaEmbedding}
                  onCheckedChange={(checked) => updateIngestionSettings({ useOllamaEmbedding: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Hybrid Embedding</Label>
                  <p className="text-xs text-muted-foreground">Combine linguistic and structural</p>
                </div>
                <Switch
                  checked={settings.ingestion.useHybridEmbedding}
                  onCheckedChange={(checked) => updateIngestionSettings({ useHybridEmbedding: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Adaptive Fusion</Label>
                  <p className="text-xs text-muted-foreground text-orange-500">
                    ⚠️ Uses 3x memory (loads 3 models)
                  </p>
                </div>
                <Switch
                  checked={settings.ingestion.useAdaptiveFusion}
                  onCheckedChange={(checked) => updateIngestionSettings({ useAdaptiveFusion: checked })}
                />
              </div>

              {settings.ingestion.useHybridEmbedding && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Structural Weight</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {settings.ingestion.structuralWeight.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[settings.ingestion.structuralWeight]}
                    onValueChange={([value]) => updateIngestionSettings({ structuralWeight: value })}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </TabsContent>
  )
}
