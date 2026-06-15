"use client"

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
import { Info } from "@phosphor-icons/react"
import { useRagDashboard } from "../rag-dashboard-context"

export function BackendTab() {
  const { backendConfig, setBackendConfig } = useRagDashboard()

  return (
    <TabsContent value="backend" className="space-y-6 mt-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Backend System Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Advanced backend settings (requires backend restart to apply)
        </p>
      </div>

      <div className="grid gap-6">
        {/* Vector Store */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <Label className="text-sm font-medium">Vector Store Type</Label>
          <Select
            value={backendConfig.vectorStoreType}
            onValueChange={(value: "lancedb" | "faiss" | "chroma" | "sqlite") =>
              setBackendConfig({ ...backendConfig, vectorStoreType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sqlite">SQLite (recommended for small-medium)</SelectItem>
              <SelectItem value="lancedb">LanceDB (fast, serverless)</SelectItem>
              <SelectItem value="faiss">FAISS (fastest, in-memory)</SelectItem>
              <SelectItem value="chroma">ChromaDB (requires server)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Backend for storing vector embeddings
          </p>
        </div>

        {/* Embedding Device */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <Label className="text-sm font-medium">Embedding Device</Label>
          <Select
            value={backendConfig.embeddingDevice}
            onValueChange={(value: "cuda" | "cpu") =>
              setBackendConfig({ ...backendConfig, embeddingDevice: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cuda">CUDA (GPU - fast)</SelectItem>
              <SelectItem value="cpu">CPU (slower, no GPU required)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Embedding Batch Size */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Embedding Batch Size</Label>
            <Badge variant="secondary" className="tabular-nums">
              {backendConfig.embeddingBatchSize}
            </Badge>
          </div>
          <Slider
            value={[backendConfig.embeddingBatchSize]}
            onValueChange={([value]) => setBackendConfig({ ...backendConfig, embeddingBatchSize: value })}
            min={8}
            max={512}
            step={8}
          />
          <p className="text-xs text-muted-foreground">
            Higher = faster processing but more GPU memory (256 for 16GB GPU, 64 for 6GB GPU)
          </p>
        </div>

        {/* GPU Memory Fraction */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">GPU Memory Fraction</Label>
            <Badge variant="secondary" className="tabular-nums">
              {(backendConfig.gpuMemoryFraction * 100).toFixed(0)}%
            </Badge>
          </div>
          <Slider
            value={[backendConfig.gpuMemoryFraction]}
            onValueChange={([value]) => setBackendConfig({ ...backendConfig, gpuMemoryFraction: value })}
            min={0.5}
            max={0.99}
            step={0.05}
          />
          <p className="text-xs text-muted-foreground">
            Percentage of GPU memory to allocate for embeddings
          </p>
        </div>

        {/* Max Workers */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Max Workers</Label>
            <Badge variant="secondary" className="tabular-nums">
              {backendConfig.maxWorkers}
            </Badge>
          </div>
          <Slider
            value={[backendConfig.maxWorkers]}
            onValueChange={([value]) => setBackendConfig({ ...backendConfig, maxWorkers: value })}
            min={1}
            max={32}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            Number of parallel workers for processing
          </p>
        </div>

        {/* Advanced Features */}
        <div className="space-y-4 p-5 rounded-xl border bg-card/50">
          <h4 className="text-sm font-medium">Advanced Features</h4>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Normalize Embeddings</Label>
              <p className="text-xs text-muted-foreground">L2 normalize embedding vectors</p>
            </div>
            <Switch
              checked={backendConfig.normalizeEmbeddings}
              onCheckedChange={(checked) => setBackendConfig({ ...backendConfig, normalizeEmbeddings: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Contextual Embeddings</Label>
              <p className="text-xs text-muted-foreground">Add document context to chunk embeddings</p>
            </div>
            <Switch
              checked={backendConfig.useContextualEmbeddings}
              onCheckedChange={(checked) => setBackendConfig({ ...backendConfig, useContextualEmbeddings: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Query Logging</Label>
              <p className="text-xs text-muted-foreground">Log all queries for analytics</p>
            </div>
            <Switch
              checked={backendConfig.enableQueryLogging}
              onCheckedChange={(checked) => setBackendConfig({ ...backendConfig, enableQueryLogging: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Router Mode</Label>
            <Select
              value={backendConfig.routerMode}
              onValueChange={(value: "rules" | "llm") =>
                setBackendConfig({ ...backendConfig, routerMode: value })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rules">Rules-Based (fast, deterministic)</SelectItem>
                <SelectItem value="llm">LLM-Based (smart, adaptive)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Method for auto-routing queries to optimal strategy
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
          <Info className="size-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
          <div className="text-xs text-orange-800 dark:text-orange-300">
            <p className="font-semibold mb-1">Backend Configuration Notice</p>
            <p>
              These settings control the backend RAG server. Changes require restarting the backend service to take effect.
              Edit <code className="bg-orange-100 dark:bg-orange-900 px-1 py-0.5 rounded">backend/.env</code> or <code className="bg-orange-100 dark:bg-orange-900 px-1 py-0.5 rounded">backend/config/settings.py</code> for persistent configuration.
            </p>
          </div>
        </div>
      </div>
    </TabsContent>
  )
}
