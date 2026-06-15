"use client"

import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
import { ArrowsClockwise } from "@phosphor-icons/react"
import { useRagDashboard } from "../rag-dashboard-context"
import { CoreOptionsSection } from "./retrieval/core-options-section"
import { QueryStrategiesSection } from "./retrieval/query-strategies-section"
import { AugmentationSection } from "./retrieval/augmentation-section"
import { LanguageSection } from "./retrieval/language-section"
import { AdvancedRetrievalSection } from "./retrieval/advanced-retrieval-section"

export function RetrievalTab() {
  const { resetRetrievalSettings } = useRagDashboard()

  return (
    <TabsContent value="retrieval" className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">Retrieval Settings</h2>
          <p className="text-sm text-muted-foreground">Configuration for document retrieval</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetRetrievalSettings}>
          <ArrowsClockwise className="size-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="grid gap-6">
        <CoreOptionsSection />
        <QueryStrategiesSection />
        <AugmentationSection />
        <LanguageSection />
        <AdvancedRetrievalSection />
      </div>
    </TabsContent>
  )
}
