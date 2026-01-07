"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { useAISettings } from "@/lib/ai-settings-store/provider"
import { Info } from "@phosphor-icons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function AgenticSettings() {
  const {
    settings,
    setEnableWebSearch,
    setMaxSearchResults,
  } = useAISettings()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-1">Agentic Capabilities</h3>
        <p className="text-xs text-muted-foreground">
          Enable AI tools to perform actions beyond text generation
        </p>
      </div>

      {/* Web Search */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Label htmlFor="enableWebSearch" className="cursor-pointer">
              Web Search
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Allows the AI to search the web for current information, news, and facts. The
                  AI will automatically decide when to use this tool.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="enableWebSearch"
            checked={settings.enableWebSearch}
            onCheckedChange={setEnableWebSearch}
          />
        </div>

        {settings.enableWebSearch && (
          <div className="ml-6 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxSearchResults" className="text-xs">
                Max Search Results
              </Label>
              <Input
                id="maxSearchResults"
                type="number"
                value={settings.maxSearchResults}
                onChange={(e) => setMaxSearchResults(parseInt(e.target.value) || 5)}
                min={1}
                max={10}
                className="w-20 h-7 text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Number of search results the AI can retrieve (1-10)
            </p>
          </div>
        )}
      </div>

      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          Agentic capabilities allow the AI to use tools autonomously. The AI decides when to use
          these tools based on the conversation context.
        </p>
      </div>
    </div>
  )
}
