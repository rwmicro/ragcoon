"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCollection } from "@/lib/api/rag"
import { Graph, ProjectorScreenChart } from "@phosphor-icons/react"
import { ArrowLeftRight, Clock, Loader2 } from "lucide-react"
import { Suspense, useEffect, useState } from "react"
import { toast } from "sonner"
import { DialogCompareCollections } from "./dialog-compare-collections"
import { GraphTimelineView } from "./graph-timeline-view"
import { GraphVisualizationEnhanced as GraphVisualization } from "./graph-visualization-enhanced"
import { UMAPVisualization } from "./umap-visualization-enhanced"

interface DialogVisualizeCollectionProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  collectionId: string
}

export function DialogVisualizeCollection({
  isOpen,
  setIsOpen,
  collectionId,
}: DialogVisualizeCollectionProps) {
  const [collectionTitle, setCollectionTitle] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    if (isOpen && collectionId) {
      const loadCollection = async () => {
        setIsLoading(true)
        try {
          const collection = await getCollection(collectionId)
          setCollectionTitle(collection.title)
        } catch (error) {
          toast.error("Failed to load collection details")
        } finally {
          setIsLoading(false)
        }
      }
      loadCollection()
    }
  }, [isOpen, collectionId])

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-background/95 flex h-[85vh] w-[70vw] max-w-[70vw] flex-col gap-0 overflow-hidden p-0 backdrop-blur-xl">
          <DialogHeader className="bg-muted/30 shrink-0 border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <span>Visualizing: {collectionTitle || "Loading..."}</span>
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setIsOpen(false)
                  setShowComparison(true)
                }}
              >
                <ArrowLeftRight className="mr-2 size-3" />
                Compare Collections
              </Button>
            </div>
          </DialogHeader>

          <div className="flex flex-1 flex-col overflow-hidden">
            <Tabs defaultValue="graph" className="flex flex-1 flex-col">
              <div className="shrink-0 px-6 pt-4">
                <TabsList className="grid w-full max-w-[600px] grid-cols-3">
                  <TabsTrigger
                    value="graph"
                    className="flex items-center gap-2"
                  >
                    <Graph className="size-4" />
                    Knowledge Graph
                  </TabsTrigger>
                  <TabsTrigger
                    value="embedding"
                    className="flex items-center gap-2"
                  >
                    <ProjectorScreenChart className="size-4" />
                    Embedding Map
                  </TabsTrigger>
                  <TabsTrigger
                    value="timeline"
                    className="flex items-center gap-2"
                  >
                    <Clock className="size-4" />
                    Timeline
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden p-6">
                <TabsContent
                  value="graph"
                  className="m-0 h-full overflow-hidden rounded-xl border bg-gradient-to-br from-blue-500/5 to-purple-500/5"
                >
                  <Suspense
                    fallback={
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="text-muted-foreground size-8 animate-spin" />
                          <p className="text-muted-foreground text-sm">
                            Loading visualization...
                          </p>
                        </div>
                      </div>
                    }
                  >
                    <GraphVisualization collectionId={collectionId} />
                  </Suspense>
                </TabsContent>

                <TabsContent
                  value="embedding"
                  className="m-0 h-full overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-500/5 to-cyan-500/5"
                >
                  <Suspense
                    fallback={
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="text-muted-foreground size-8 animate-spin" />
                          <p className="text-muted-foreground text-sm">
                            Loading visualization...
                          </p>
                        </div>
                      </div>
                    }
                  >
                    <UMAPVisualization collectionId={collectionId} />
                  </Suspense>
                </TabsContent>

                <TabsContent
                  value="timeline"
                  className="m-0 h-full overflow-hidden rounded-xl border bg-gradient-to-br from-amber-500/5 to-orange-500/5"
                >
                  <Suspense
                    fallback={
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="text-muted-foreground size-8 animate-spin" />
                          <p className="text-muted-foreground text-sm">
                            Loading timeline...
                          </p>
                        </div>
                      </div>
                    }
                  >
                    <GraphTimelineView collectionId={collectionId} />
                  </Suspense>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comparison Dialog */}
      <DialogCompareCollections
        isOpen={showComparison}
        setIsOpen={setShowComparison}
        defaultCollectionId={collectionId}
      />
    </>
  )
}
