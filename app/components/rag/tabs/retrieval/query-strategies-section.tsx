"use client"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ListMagnifyingGlass, MagicWand } from "@phosphor-icons/react"
import { useRagDashboard } from "../../rag-dashboard-context"
import { RetrievalFeatureCard } from "./retrieval-feature-card"

export function QueryStrategiesSection() {
  const { settings, updateRetrievalSettings } = useRagDashboard()

  return (
    <>
      {/* Multi-Query */}
      <RetrievalFeatureCard
        id="enableMultiQuery"
        icon={ListMagnifyingGlass}
        iconClassName="bg-emerald-500/10 text-emerald-500"
        title="Multi-Query"
        tooltip="Generates multiple variations of your question to catch relevant documents."
        subtitle="Query expansion & variations"
        checked={settings.retrieval.strategy === "multi-query"}
        onCheckedChange={(checked) =>
          updateRetrievalSettings({ strategy: checked ? "multi-query" : "basic" })
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Variations Count</Label>
            <span className="text-xs text-muted-foreground tabular-nums">{settings.retrieval.numQueryVariations}</span>
          </div>
          <Slider
            value={[settings.retrieval.numQueryVariations]}
            onValueChange={([value]) => updateRetrievalSettings({ numQueryVariations: value })}
            min={2}
            max={5}
            step={1}
          />
        </div>
      </RetrievalFeatureCard>

      {/* HyDE */}
      <RetrievalFeatureCard
        id="enableHyDE"
        icon={MagicWand}
        iconClassName="bg-purple-500/10 text-purple-500"
        title="HyDE"
        tooltip="Hypothetical Document Embeddings - generates hypothetical answers to improve search."
        subtitle="Hypothetical Document Embeddings"
        checked={settings.retrieval.strategy === "hyde"}
        onCheckedChange={(checked) =>
          updateRetrievalSettings({ strategy: checked ? "hyde" : "basic" })
        }
      >
        <div className="space-y-2">
          <Label className="text-xs font-medium">Fusion Method</Label>
          <Select
            value={settings.retrieval.hydeFusion}
            onValueChange={(value: "average" | "max" | "rrf") => updateRetrievalSettings({ hydeFusion: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rrf">RRF (Reciprocal Rank Fusion)</SelectItem>
              <SelectItem value="average">Average Scores</SelectItem>
              <SelectItem value="max">Maximum Score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Hypotheses Count</Label>
            <span className="text-xs text-muted-foreground tabular-nums">{settings.retrieval.numHypotheticalDocs}</span>
          </div>
          <Slider
            value={[settings.retrieval.numHypotheticalDocs]}
            onValueChange={([value]) => updateRetrievalSettings({ numHypotheticalDocs: value })}
            min={1}
            max={5}
            step={1}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="useMultilingualHyDE" className="text-xs font-medium cursor-pointer">
              Multilingual HyDE
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">Generate docs in query language</p>
          </div>
          <Switch
            id="useMultilingualHyDE"
            checked={settings.retrieval.useMultilingualHyDE}
            onCheckedChange={(checked) => updateRetrievalSettings({ useMultilingualHyDE: checked })}
          />
        </div>
      </RetrievalFeatureCard>
    </>
  )
}
