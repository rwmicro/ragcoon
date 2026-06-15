"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowsClockwise,
  CircleNotch,
  CheckCircle,
  XCircle,
  Info,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { RESPONSE_LENGTH_OPTIONS, MAX_TOKENS_FOR_LENGTH } from "../dashboard-utils"
import { useRagDashboard } from "../rag-dashboard-context"

export function LlmTab() {
  const {
    settings,
    updateLLMSettings,
    resetLLMSettings,
    llmModels,
    isTestingConnection,
    connectionStatus,
    handleTestConnection,
  } = useRagDashboard()

  return (
    <TabsContent value="llm" className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">LLM & Prompt Configuration</h2>
          <p className="text-sm text-muted-foreground">Generation model and custom system prompt</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLLMSettings}>
          <ArrowsClockwise className="size-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Connection Test */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <Label className="text-sm font-medium">Ollama Connection</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={isTestingConnection}>
              {isTestingConnection ? (
                <CircleNotch className="size-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="size-4 mr-2" />
              )}
              Test Connection
            </Button>

            {connectionStatus === "success" && (
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle className="size-4" weight="fill" />
                <span className="text-xs font-medium">Connected</span>
              </div>
            )}

            {connectionStatus === "error" && (
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <XCircle className="size-4" weight="fill" />
                <span className="text-xs font-medium">Failed</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">URL: http://localhost:11434</p>
        </div>

        {/* Model Selection */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <Label className="text-sm font-medium">LLM Model</Label>
          <Select
            value={settings.llm.model}
            onValueChange={(value) => updateLLMSettings({ model: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {llmModels.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No models found. Start Ollama.
                </div>
              ) : (
                llmModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Model used for generating responses from retrieved context
          </p>
        </div>

        {/* Temperature */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Temperature</Label>
            <Badge variant="secondary" className="tabular-nums">
              {settings.llm.temperature.toFixed(2)}
            </Badge>
          </div>
          <Slider
            value={[settings.llm.temperature]}
            onValueChange={([value]) => updateLLMSettings({ temperature: value })}
            min={0}
            max={1}
            step={0.05}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Precise (0.0)</span>
            <span>Creative (1.0)</span>
          </div>
        </div>

        {/* Response Length */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <Label className="text-sm font-medium">Response Length</Label>
          <div className="grid grid-cols-3 gap-3">
            {RESPONSE_LENGTH_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  updateLLMSettings({
                    responseLength: option.value,
                    maxTokens: MAX_TOKENS_FOR_LENGTH[option.value],
                  })
                }
                className={cn(
                  "p-3 rounded-lg border text-center transition-all hover:border-primary/50",
                  settings.llm.responseLength === option.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "bg-card"
                )}
              >
                <div className="font-medium text-sm mb-1">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.desc}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Max tokens: {settings.llm.maxTokens.toLocaleString()}</p>
        </div>

        {/* Custom System Prompt */}
        <div className="space-y-3 p-5 rounded-xl border bg-card/50">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Custom System Prompt</Label>
            <Badge variant="outline" className="text-[10px]">
              Optional
            </Badge>
          </div>
          <Textarea
            value={settings.llm.systemPrompt}
            onChange={(e) => updateLLMSettings({ systemPrompt: e.target.value })}
            placeholder="Enter a custom system prompt for RAG responses (leave empty for default)"
            className="min-h-[200px] font-mono text-xs"
          />
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-300">
              This prompt will be used for ALL RAG responses. Leave empty for default behavior.
            </p>
          </div>
        </div>
      </div>
    </TabsContent>
  )
}
