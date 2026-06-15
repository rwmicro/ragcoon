"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Database,
  Cpu,
  GearSix,
  MagnifyingGlass,
  ChartBar,
  HardDrives,
} from "@phosphor-icons/react"
import { StatsDashboard } from "./stats-dashboard"
import { DialogEditCollection } from "./dialog-edit-collection"
import { RagDashboardProvider, useRagDashboard } from "./rag-dashboard-context"
import { CollectionsTab } from "./tabs/collections-tab"
import { IngestionTab } from "./tabs/ingestion-tab"
import { RetrievalTab } from "./tabs/retrieval-tab"
import { LlmTab } from "./tabs/llm-tab"
import { BackendTab } from "./tabs/backend-tab"

function DashboardContent() {
  const {
    editingCollectionId,
    setEditingCollectionId,
    fetchCollections,
  } = useRagDashboard()

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">RAG Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Complete configuration for RAG collections, ingestion, retrieval, and backend
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="collections" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="collections">
            <Database className="size-4 mr-2" />
            Collections
          </TabsTrigger>
          <TabsTrigger value="ingestion">
            <GearSix className="size-4 mr-2" />
            Ingestion
          </TabsTrigger>
          <TabsTrigger value="retrieval">
            <MagnifyingGlass className="size-4 mr-2" />
            Retrieval
          </TabsTrigger>
          <TabsTrigger value="llm">
            <Cpu className="size-4 mr-2" />
            LLM & Prompt
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <ChartBar className="size-4 mr-2" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="backend">
            <HardDrives className="size-4 mr-2" />
            Backend Config
          </TabsTrigger>
        </TabsList>

        <CollectionsTab />
        <IngestionTab />
        <RetrievalTab />
        <LlmTab />

        <TabsContent value="statistics" className="space-y-6 mt-6">
          <StatsDashboard />
        </TabsContent>

        <BackendTab />
      </Tabs>

      {/* Edit Collection Dialog */}
      {editingCollectionId && (
        <DialogEditCollection
          isOpen={!!editingCollectionId}
          setIsOpen={(open) => !open && setEditingCollectionId(null)}
          collectionId={editingCollectionId}
          onUpdated={fetchCollections}
        />
      )}
    </div>
  )
}

export function RAGDashboardComplete() {
  return (
    <RagDashboardProvider>
      <DashboardContent />
    </RagDashboardProvider>
  )
}
