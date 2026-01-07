"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useModel } from "@/lib/model-store/provider"
import { CircleNotch, Check, Database, ChatTeardropText } from "@phosphor-icons/react"
import { toast } from "sonner"
import { updateCollection, getCollection, type RAGCollection } from "@/lib/api/rag"
import { Badge } from "@/components/ui/badge"

interface DialogEditCollectionProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  collectionId: string
  onUpdated?: () => void
}

export function DialogEditCollection({
  isOpen,
  setIsOpen,
  collectionId,
  onUpdated,
}: DialogEditCollectionProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collection, setCollection] = useState<RAGCollection | null>(null)
  const [llmModel, setLlmModel] = useState<string>("")
  const [embeddingModel, setEmbeddingModel] = useState<string>("")

  const { models } = useModel()

  // Filter models for different purposes
  const ollamaModels = models.filter((model) => model.providerId === "ollama")
  const llmModels = ollamaModels.filter((model) => !model.id.includes("embed"))
  const embeddingModels = ollamaModels.filter((model) => model.id.includes("embed"))

  // Load collection data
  useEffect(() => {
    if (isOpen && collectionId) {
      loadCollection()
    }
  }, [isOpen, collectionId])

  const loadCollection = async () => {
    setLoading(true)
    try {
      const data = await getCollection(collectionId)
      setCollection(data)
      setLlmModel(data.llm_model)
      setEmbeddingModel(data.embedding_model)
    } catch (error) {
      toast.error(`Failed to load collection: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!collection) return

    setSaving(true)
    try {
      await updateCollection(collectionId, {
        llmModel,
        embeddingModel,
      })

      toast.success(`Collection updated successfully`)

      // Dispatch event to refresh models list
      window.dispatchEvent(new Event('rag-model-created'))

      setIsOpen(false)
      onUpdated?.()
    } catch (error) {
      toast.error(`Failed to update collection: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = collection && (llmModel !== collection.llm_model || embeddingModel !== collection.embedding_model)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="size-5" weight="duotone" />
            Edit Collection
          </DialogTitle>
          <DialogDescription>
            Update the models used by this RAG collection
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <CircleNotch className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : collection ? (
          <div className="space-y-4 py-4">
            {/* Collection Info */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Collection Name</Label>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{collection.title}</p>
                <Badge variant="secondary" className="text-xs">
                  {collection.chunk_count} chunks
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {collection.file_count} files
                </Badge>
              </div>
            </div>

            {/* LLM Model */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ChatTeardropText className="size-4 text-muted-foreground" weight="duotone" />
                <Label className="text-sm font-semibold">LLM Model (Generation)</Label>
              </div>
              <Select value={llmModel} onValueChange={setLlmModel}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select LLM model" />
                </SelectTrigger>
                <SelectContent>
                  {llmModels.length > 0 ? (
                    llmModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{model.name}</span>
                          {model.description && (
                            <span className="text-xs text-muted-foreground">
                              {model.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No Ollama models found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This model generates answers from indexed documents
              </p>
            </div>

            {/* Embedding Model */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-muted-foreground" weight="duotone" />
                <Label className="text-sm font-semibold">Embedding Model</Label>
              </div>
              <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select embedding model" />
                </SelectTrigger>
                <SelectContent>
                  {/* Ollama embedding models */}
                  {embeddingModels.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground bg-muted/50">
                        Ollama Models
                      </div>
                      {embeddingModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">{model.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {/* SentenceTransformers models */}
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground bg-muted/50">
                    SentenceTransformers
                  </div>
                  <SelectItem value="BAAI/bge-large-en-v1.5">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">BGE Large</span>
                      <span className="text-[10px] text-muted-foreground">1024 dim • High quality</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="BAAI/bge-base-en-v1.5">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">BGE Base</span>
                      <span className="text-[10px] text-muted-foreground">768 dim • Balanced</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="intfloat/e5-large-v2">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">E5 Large</span>
                      <span className="text-[10px] text-muted-foreground">1024 dim • High quality</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Note: Changing embedding model only affects new documents
              </p>
            </div>

            {hasChanges && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> Model changes will apply to new queries immediately.
                  Embedding model changes only affect newly uploaded documents.
                </p>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <>
                <CircleNotch className="size-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="size-4 mr-2" weight="bold" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
