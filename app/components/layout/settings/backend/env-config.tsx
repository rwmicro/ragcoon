"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  HardDrives,
  Database,
  Cpu,
  Lightning,
  ArrowsClockwise,
  FloppyDisk,
  Warning,
  CheckCircle,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface EnvConfig {
  [category: string]: {
    [key: string]: string
  }
}

const categoryIcons: Record<string, any> = {
  server: HardDrives,
  paths: Database,
  vector_store: Database,
  embedding: Cpu,
  llm: Lightning,
  chunking: Lightning,
  retrieval: Lightning,
  reranking: Lightning,
  compression: Lightning,
  cache: Database,
  performance: Lightning,
  observability: HardDrives,
}

const categoryLabels: Record<string, string> = {
  server: "Server Configuration",
  paths: "File Paths",
  vector_store: "Vector Store",
  embedding: "Embedding Model",
  llm: "LLM Configuration",
  chunking: "Chunking Settings",
  retrieval: "Retrieval Settings",
  reranking: "Reranking",
  compression: "Context Compression",
  cache: "Cache Configuration",
  performance: "Performance",
  observability: "Observability",
  other: "Other Settings",
}

export function EnvConfigPanel() {
  const [config, setConfig] = useState<EnvConfig>({})
  const [originalConfig, setOriginalConfig] = useState<EnvConfig>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [backendStatus, setBackendStatus] = useState<"checking" | "available" | "unavailable">("checking")

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    // Check if there are changes
    const changed = JSON.stringify(config) !== JSON.stringify(originalConfig)
    setHasChanges(changed)
  }, [config, originalConfig])

  const loadConfig = async () => {
    setIsLoading(true)
    setBackendStatus("checking")
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8001"}/config/env`
      )

      if (!response.ok) throw new Error("Failed to load configuration")

      const data = await response.json()
      setConfig(data.config)
      setOriginalConfig(data.config)
      setBackendStatus("available")
    } catch {
      setBackendStatus("unavailable")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8001"}/config/env`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        }
      )

      if (!response.ok) throw new Error("Failed to save configuration")

      const data = await response.json()
      setOriginalConfig(config)
      toast.success(data.message, {
        description: data.note,
      })
    } catch (error) {
      console.error("Failed to save config:", error)
      toast.error("Failed to save configuration")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setConfig(originalConfig)
    toast.info("Changes discarded")
  }

  const handleChange = (category: string, key: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }))
  }

  if (backendStatus === "checking") {
    return (
      <div className="flex items-center justify-center py-12">
        <CircleNotch className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (backendStatus === "unavailable") {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <WarningCircle size={48} className="text-destructive opacity-80" />
          <div>
            <p className="text-foreground text-lg font-medium">Backend unavailable</p>
            <p className="text-muted-foreground mt-1 text-sm">
              The RAG backend could not be reached on{" "}
              <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
                {process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8001"}
              </code>
            </p>
          </div>
          <button
            type="button"
            onClick={loadConfig}
            className="hover:bg-accent text-foreground inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors"
          >
            <ArrowsClockwise size={14} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Backend Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Manage environment variables for the RAG backend
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadConfig}
            disabled={isLoading || isSaving}
          >
            <ArrowsClockwise
              className={cn("size-4 mr-2", isLoading && "animate-spin")}
            />
            Reload
          </Button>
          {hasChanges && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <CircleNotch className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FloppyDisk className="size-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Warning */}
      {hasChanges && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
          <Warning className="size-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-yellow-800 dark:text-yellow-300">
              Unsaved Changes
            </p>
            <p className="text-yellow-700 dark:text-yellow-400 mt-1">
              You must restart the backend for changes to take effect
            </p>
          </div>
        </div>
      )}

      {/* Configuration Sections */}
      <Accordion type="multiple" className="w-full" defaultValue={["server", "embedding", "llm"]}>
        {Object.entries(config).map(([category, values]) => {
          if (Object.keys(values).length === 0) return null

          const Icon = categoryIcons[category] || HardDrives
          const label = categoryLabels[category] || category

          return (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Icon className="size-5" weight="duotone" />
                  <span className="font-medium">{label}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {Object.keys(values).length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {Object.entries(values).map(([key, value]) => {
                    const hasChanged =
                      originalConfig[category]?.[key] !== value

                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-mono text-muted-foreground">
                            {key}
                          </Label>
                          {hasChanged && (
                            <Badge variant="outline" className="text-[10px]">
                              Modified
                            </Badge>
                          )}
                        </div>
                        <Input
                          value={value}
                          onChange={(e) =>
                            handleChange(category, key, e.target.value)
                          }
                          className={cn(
                            "font-mono text-xs",
                            hasChanged && "border-primary"
                          )}
                        />
                      </div>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Footer Info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <CheckCircle className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 dark:text-blue-300">
          Changes are saved to <code className="font-mono">/backend/.env</code>.
          Remember to restart the backend server after saving.
        </p>
      </div>
    </div>
  )
}
