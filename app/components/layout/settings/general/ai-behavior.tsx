"use client"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAISettings } from "@/lib/ai-settings-store/provider"
import { ArrowCounterClockwise, Info } from "@phosphor-icons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function AIBehavior() {
  const {
    settings,
    setTemperature,
    setMaxTokens,
    setTopP,
    setFrequencyPenalty,
    setPresencePenalty,
    resetToDefaults,
  } = useAISettings()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">AI Behavior</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefaults}
              className="h-8 gap-2"
            >
              <ArrowCounterClockwise className="size-4" />
              Reset
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reset all AI parameters to default values</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Controls randomness. Lower values (0.0-0.7) make responses more focused and
                  deterministic. Higher values (0.7-2.0) make them more creative and varied.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="text-sm text-muted-foreground">{settings.temperature.toFixed(2)}</span>
        </div>
        <Slider
          id="temperature"
          value={[settings.temperature]}
          onValueChange={([value]) => setTemperature(value)}
          min={0}
          max={2}
          step={0.05}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Focused (0.0)</span>
          <span>Balanced (0.7)</span>
          <span>Creative (2.0)</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="maxTokens">Max Tokens</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Maximum length of the response. Higher values allow longer responses but use
                  more resources. 1 token ≈ 4 characters.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            type="number"
            value={settings.maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
            min={256}
            max={8192}
            step={256}
            className="w-24 h-8"
          />
        </div>
        <Slider
          id="maxTokens"
          value={[settings.maxTokens]}
          onValueChange={([value]) => setMaxTokens(value)}
          min={256}
          max={8192}
          step={256}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Short (256)</span>
          <span>Medium (2048)</span>
          <span>Long (8192)</span>
        </div>
      </div>

      {/* Top P */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="topP">Top P (Nucleus Sampling)</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Controls diversity via nucleus sampling. Consider only tokens with cumulative
                  probability up to this threshold. Lower = more focused, higher = more diverse.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="text-sm text-muted-foreground">{settings.topP.toFixed(2)}</span>
        </div>
        <Slider
          id="topP"
          value={[settings.topP]}
          onValueChange={([value]) => setTopP(value)}
          min={0}
          max={1}
          step={0.05}
          className="w-full"
        />
      </div>

      {/* Frequency Penalty */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="frequencyPenalty">Frequency Penalty</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Reduces repetition of tokens based on how often they appear. Positive values
                  discourage repetition, negative values allow more repetition.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="text-sm text-muted-foreground">{settings.frequencyPenalty.toFixed(2)}</span>
        </div>
        <Slider
          id="frequencyPenalty"
          value={[settings.frequencyPenalty]}
          onValueChange={([value]) => setFrequencyPenalty(value)}
          min={-2}
          max={2}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* Presence Penalty */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="presencePenalty">Presence Penalty</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Encourages the model to talk about new topics. Positive values make the AI
                  more likely to introduce new subjects.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="text-sm text-muted-foreground">{settings.presencePenalty.toFixed(2)}</span>
        </div>
        <Slider
          id="presencePenalty"
          value={[settings.presencePenalty]}
          onValueChange={([value]) => setPresencePenalty(value)}
          min={-2}
          max={2}
          step={0.1}
          className="w-full"
        />
      </div>

      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          These settings affect how the AI generates responses. Changes apply to all future messages.
        </p>
      </div>
    </div>
  )
}
