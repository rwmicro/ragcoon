"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  MagnifyingGlass,
  Plus,
  CircleNotch,
  CheckCircle,
  XCircle,
  Database,
  ArrowsClockwise,
  Brain,
  Sparkle,
} from "@phosphor-icons/react"
import { toast } from "sonner"

interface ModelInfo {
  name: string
  dimension: number
  max_seq_length: number
  model_type: string
  description: string
  size_mb?: number
  shortcut?: string
  available?: boolean | null
}

interface EmbeddingModelSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function EmbeddingModelSelector({
  value,
  onChange,
  disabled,
  className,
}: EmbeddingModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [customModel, setCustomModel] = useState({
    name: "",
    dimension: 768,
    max_seq_length: 512,
  })
  const [isValidating, setIsValidating] = useState(false)
  const [isAutoDetecting, setIsAutoDetecting] = useState(false)
  const [autoDetectError, setAutoDetectError] = useState<string | null>(null)

  // Load models from backend
  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async (checkAvailability = false, bustCache = false) => {
    setIsLoading(true)
    try {
      // Add cache busting timestamp if requested (for refresh)
      const cacheBuster = bustCache ? `&_t=${Date.now()}` : ''
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8001"}/models?model_type=embedding&check_availability=${checkAvailability}${cacheBuster}`,
        {
          // Disable cache for refresh
          cache: bustCache ? 'no-cache' : 'default'
        }
      )
      if (!response.ok) throw new Error("Failed to fetch models")

      const data = await response.json()
      setModels(data.embedding_models || [])

      if (bustCache) {
        toast.success(`Refreshed: ${data.embedding_models?.length || 0} models found`)
      }
    } catch (error) {
      console.error("Failed to load models:", error)
      toast.error("Failed to load embedding models")
    } finally {
      setIsLoading(false)
    }
  }

  // Filter models based on search and type
  const filteredModels = models.filter((model) => {
    const matchesSearch =
      searchQuery === "" ||
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType =
      filterType === "all" ||
      (filterType === "huggingface" && model.model_type === "huggingface") ||
      (filterType === "ollama" && model.model_type === "ollama")

    return matchesSearch && matchesType
  })

  // Group models by type
  const groupedModels = filteredModels.reduce((acc, model) => {
    const type = model.model_type || "other"
    if (!acc[type]) acc[type] = []
    acc[type].push(model)
    return acc
  }, {} as Record<string, ModelInfo[]>)

  const handleAutoDetect = async () => {
    if (!customModel.name.trim()) {
      toast.error("Please enter a model name first")
      return
    }

    if (!customModel.name.includes("/")) {
      toast.error("Model name should be in format: organization/model-name")
      return
    }

    setIsAutoDetecting(true)
    setAutoDetectError(null)

    try {
      // Try to fetch model config from HuggingFace
      const configUrl = `https://huggingface.co/${customModel.name}/raw/main/config.json`

      const response = await fetch(configUrl)
      if (!response.ok) {
        throw new Error(`Model not found or config unavailable (${response.status})`)
      }

      const config = await response.json()

      // Try to extract dimension and max_position_embeddings
      let dimension = config.hidden_size || config.d_model || config.dim || null
      let maxSeqLength = config.max_position_embeddings || config.max_seq_length || config.n_positions || null

      // Some models have it nested
      if (!dimension && config.text_config) {
        dimension = config.text_config.hidden_size
      }
      if (!maxSeqLength && config.text_config) {
        maxSeqLength = config.text_config.max_position_embeddings
      }

      if (!dimension) {
        throw new Error("Could not detect embedding dimension from model config")
      }

      setCustomModel({
        ...customModel,
        dimension: dimension,
        max_seq_length: maxSeqLength || 512,
      })

      toast.success(`Auto-detected: ${dimension}D, max length ${maxSeqLength || 512}`)
    } catch (error) {
      console.error("Auto-detection error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to auto-detect model parameters"
      setAutoDetectError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsAutoDetecting(false)
    }
  }

  const handleValidateCustomModel = async () => {
    if (!customModel.name.trim()) {
      toast.error("Please enter a model name")
      return
    }

    setIsValidating(true)
    try {
      // Basic validation: check if it's a valid HuggingFace model format
      if (!customModel.name.includes("/")) {
        toast.error("Model name should be in format: organization/model-name")
        return
      }

      // Add the custom model (backend will validate it during ingestion)
      onChange(customModel.name)
      setIsAddDialogOpen(false)
      toast.success(`Added custom model: ${customModel.name}`)

      // Reset form
      setCustomModel({
        name: "",
        dimension: 768,
        max_seq_length: 512,
      })
      setAutoDetectError(null)
    } catch (error) {
      console.error("Validation error:", error)
      toast.error("Failed to validate model")
    } finally {
      setIsValidating(false)
    }
  }

  const formatSize = (sizeMb?: number) => {
    if (!sizeMb) return null
    if (sizeMb < 1000) return `${sizeMb}MB`
    return `${(sizeMb / 1024).toFixed(1)}GB`
  }

  const getModelIcon = (modelType: string) => {
    switch (modelType.toLowerCase()) {
      case 'huggingface':
        return <Sparkle className="size-4 text-amber-500" weight="duotone" />
      case 'ollama':
        return <Brain className="size-4 text-blue-500" weight="duotone" />
      default:
        return <Database className="size-4 text-muted-foreground" weight="duotone" />
    }
  }

  // Find currently selected model
  const selectedModel = models.find((m) => m.name === value)

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Embedding Model</Label>
        {!disabled && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadModels(false, true)}
              disabled={isLoading}
              className="h-7 text-xs"
            >
              {isLoading ? (
                <CircleNotch className="size-3 animate-spin mr-1.5" />
              ) : (
                <ArrowsClockwise className="size-3 mr-1.5" />
              )}
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="h-7 text-xs"
            >
              <Plus className="size-3 mr-1.5" />
              Add Custom
            </Button>
          </div>
        )}
      </div>

      {/* Current Selection Display */}
      {selectedModel && (
        <div className="p-3 rounded-lg border bg-muted/30">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="font-medium text-sm">{selectedModel.name}</div>
              <div className="text-xs text-muted-foreground">
                {selectedModel.description}
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {selectedModel.dimension}D
            </Badge>
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>Max length: {selectedModel.max_seq_length}</span>
            {selectedModel.size_mb && (
              <>
                <span>•</span>
                <span>{formatSize(selectedModel.size_mb)}</span>
              </>
            )}
            <span>•</span>
            <Badge variant="outline" className="text-[10px] h-5">
              {selectedModel.model_type}
            </Badge>
          </div>
        </div>
      )}

      {/* Model Selection Dropdown */}
      {!disabled && (
        <>
          <div className="space-y-2">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterType === "all" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
                className="h-8 text-xs"
              >
                All ({models.length})
              </Button>
              <Button
                variant={filterType === "huggingface" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFilterType("huggingface")}
                className="h-8 text-xs"
              >
                Hugging Face
              </Button>
              <Button
                variant={filterType === "ollama" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFilterType("ollama")}
                className="h-8 text-xs"
              >
                Ollama
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[700px] rounded-lg border">
            <div className="p-3 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <CircleNotch className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredModels.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No models found
                </div>
              ) : (
                Object.entries(groupedModels).map(([type, typeModels]) => (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center gap-2 px-2">
                      {getModelIcon(type)}
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        {type}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    {typeModels.map((model) => (
                      <button
                        key={model.name}
                        onClick={() => onChange(model.name)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50",
                          value === model.name
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "bg-card"
                        )}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2 font-medium text-sm pr-2">
                            {getModelIcon(model.model_type)}
                            <span>
                              {model.shortcut ? (
                                <>
                                  <span className="text-primary">{model.shortcut}</span>
                                  <span className="text-muted-foreground text-xs ml-2">
                                    ({model.name})
                                  </span>
                                </>
                              ) : (
                                model.name
                              )}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {model.dimension}D
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {model.description}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">
                            Max: {model.max_seq_length}
                          </span>
                          {model.size_mb && (
                            <>
                              <span className="text-[10px] text-muted-foreground">
                                •
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatSize(model.size_mb)}
                              </span>
                            </>
                          )}
                          {model.available !== null && model.available !== undefined && (
                            <>
                              <span className="text-[10px] text-muted-foreground">
                                •
                              </span>
                              {model.available ? (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <CheckCircle className="size-3" weight="fill" />
                                  <span className="text-[10px]">Available</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                  <XCircle className="size-3" weight="fill" />
                                  <span className="text-[10px]">Unavailable</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {/* Info text */}
      <p className="text-[10px] text-muted-foreground">
        💡 All documents in a collection must use the same embedding model and dimension
      </p>

      {/* Add Custom Model Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Hugging Face Model</DialogTitle>
            <DialogDescription>
              Enter the details of a Hugging Face embedding model
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Model Name</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoDetect}
                  disabled={!customModel.name.trim() || isAutoDetecting}
                  className="h-7 text-xs"
                >
                  {isAutoDetecting ? (
                    <>
                      <CircleNotch className="size-3 mr-1.5 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <MagnifyingGlass className="size-3 mr-1.5" />
                      Auto-Detect
                    </>
                  )}
                </Button>
              </div>
              <Input
                placeholder="e.g., BAAI/bge-large-en-v1.5"
                value={customModel.name}
                onChange={(e) => {
                  setCustomModel({ ...customModel, name: e.target.value })
                  setAutoDetectError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customModel.name.includes("/")) {
                    handleAutoDetect()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Format: organization/model-name (e.g., sentence-transformers/all-MiniLM-L6-v2)
                <br />
                Press Enter or click Auto-Detect after entering the model name
              </p>
              {autoDetectError && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <XCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 dark:text-red-300">
                    {autoDetectError}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Embedding Dimension</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={customModel.dimension}
                    onChange={(e) =>
                      setCustomModel({
                        ...customModel,
                        dimension: parseInt(e.target.value) || 768,
                      })
                    }
                  />
                  {isAutoDetecting && (
                    <CircleNotch className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Common: 384, 768, 1024
                </p>
              </div>

              <div className="space-y-2">
                <Label>Max Sequence Length</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={customModel.max_seq_length}
                    onChange={(e) =>
                      setCustomModel({
                        ...customModel,
                        max_seq_length: parseInt(e.target.value) || 512,
                      })
                    }
                  />
                  {isAutoDetecting && (
                    <CircleNotch className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Common: 512, 2048, 8192
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <CheckCircle className="size-4 text-blue-600 dark:text-blue-400 inline mr-2" />
              <p className="text-xs text-blue-800 dark:text-blue-300 inline">
                Click "Auto-Detect" to automatically fetch model parameters from Hugging Face.
                The model will be downloaded on first use.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isValidating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleValidateCustomModel}
              disabled={isValidating || !customModel.name.trim()}
            >
              {isValidating ? (
                <>
                  <CircleNotch className="size-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                "Add Model"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
