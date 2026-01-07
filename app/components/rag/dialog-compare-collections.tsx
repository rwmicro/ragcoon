"use client"

import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { listCollections, RAGCollection } from "@/lib/api/rag"
import { Graph, ProjectorScreenChart } from "@phosphor-icons/react"
import { ArrowLeftRight, Loader2 } from "lucide-react"
import { Suspense, useEffect, useState } from "react"
import { toast } from "sonner"
import { GraphVisualizationEnhanced as GraphVisualization } from "./graph-visualization-enhanced"
import { UMAPVisualization } from "./umap-visualization-enhanced"

interface DialogCompareCollectionsProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  defaultCollectionId?: string
}

export function DialogCompareCollections({
  isOpen,
  setIsOpen,
  defaultCollectionId,
}: DialogCompareCollectionsProps) {
  const [collections, setCollections] = useState<RAGCollection[]>([])
  const [isLoadingCollections, setIsLoadingCollections] = useState(false)
  const [collectionA, setCollectionA] = useState<string>(
    defaultCollectionId || ""
  )
  const [collectionB, setCollectionB] = useState<string>("")
  const [viewMode, setViewMode] = useState<"graph" | "umap">("graph")

  useEffect(() => {
    if (isOpen) {
      loadCollections()
    }
  }, [isOpen])

  useEffect(() => {
    if (defaultCollectionId && collections.length > 0) {
      setCollectionA(defaultCollectionId)
      // Auto-select second collection if available
      const otherCollection = collections.find(
        (c) => c.id !== defaultCollectionId
      )
      if (otherCollection) {
        setCollectionB(otherCollection.id)
      }
    }
  }, [defaultCollectionId, collections])

  const loadCollections = async () => {
    setIsLoadingCollections(true)
    try {
      const result = await listCollections()
      setCollections(result.collections)
    } catch (error) {
      toast.error("Failed to load collections")
    } finally {
      setIsLoadingCollections(false)
    }
  }

  const getCollectionTitle = (id: string) => {
    const collection = collections.find((c) => c.id === id)
    return collection?.title || id
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-background/95 flex h-[90vh] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 backdrop-blur-xl">
        <DialogHeader className="bg-muted/30 shrink-0 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-5" />
            Compare Collections
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Controls */}
          <div className="bg-muted/10 shrink-0 space-y-4 border-b px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Collection A</Label>
                <Select value={collectionA} onValueChange={setCollectionA}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select first collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Collection B</Label>
                <Select value={collectionB} onValueChange={setCollectionB}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select second collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "graph" | "umap")}
            >
              <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="graph" className="flex items-center gap-2">
                  <Graph className="size-4" />
                  Knowledge Graph
                </TabsTrigger>
                <TabsTrigger value="umap" className="flex items-center gap-2">
                  <ProjectorScreenChart className="size-4" />
                  Embedding Map
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Visualizations */}
          {isLoadingCollections ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="text-muted-foreground size-8 animate-spin" />
                <p className="text-muted-foreground text-sm">
                  Loading collections...
                </p>
              </div>
            </div>
          ) : !collectionA || !collectionB ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-muted-foreground text-center">
                <ArrowLeftRight className="mx-auto mb-4 size-12 opacity-20" />
                <p className="text-sm">Select two collections to compare</p>
              </div>
            </div>
          ) : (
            <div className="bg-border grid min-h-0 flex-1 grid-cols-2 gap-px">
              {/* Collection A */}
              <div className="bg-background flex flex-col overflow-hidden">
                <div className="bg-muted/20 shrink-0 border-b px-4 py-2">
                  <h3 className="truncate text-sm font-medium">
                    {getCollectionTitle(collectionA)}
                  </h3>
                </div>
                <div className="min-h-0 flex-1">
                  {viewMode === "graph" ? (
                    <Suspense
                      fallback={
                        <div className="flex h-full w-full items-center justify-center">
                          <Loader2 className="text-muted-foreground size-8 animate-spin" />
                        </div>
                      }
                    >
                      <GraphVisualization collectionId={collectionA} />
                    </Suspense>
                  ) : (
                    <Suspense
                      fallback={
                        <div className="flex h-full w-full items-center justify-center">
                          <Loader2 className="text-muted-foreground size-8 animate-spin" />
                        </div>
                      }
                    >
                      <UMAPVisualization collectionId={collectionA} />
                    </Suspense>
                  )}
                </div>
              </div>

              {/* Collection B */}
              <div className="bg-background flex flex-col overflow-hidden">
                <div className="bg-muted/20 shrink-0 border-b px-4 py-2">
                  <h3 className="truncate text-sm font-medium">
                    {getCollectionTitle(collectionB)}
                  </h3>
                </div>
                <div className="min-h-0 flex-1">
                  {viewMode === "graph" ? (
                    <Suspense
                      fallback={
                        <div className="flex h-full w-full items-center justify-center">
                          <Loader2 className="text-muted-foreground size-8 animate-spin" />
                        </div>
                      }
                    >
                      <GraphVisualization collectionId={collectionB} />
                    </Suspense>
                  ) : (
                    <Suspense
                      fallback={
                        <div className="flex h-full w-full items-center justify-center">
                          <Loader2 className="text-muted-foreground size-8 animate-spin" />
                        </div>
                      }
                    >
                      <UMAPVisualization collectionId={collectionB} />
                    </Suspense>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
