"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Info, Translate } from "@phosphor-icons/react"
import { useRagDashboard } from "../../rag-dashboard-context"

const LANGUAGES: { value: string; label: string }[] = [
  { value: "auto", label: "Auto-detect (Recommended)" },
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "ru", label: "Russian" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" },
  { value: "he", label: "Hebrew" },
  { value: "tr", label: "Turkish" },
  { value: "hi", label: "Hindi" },
]

export function LanguageSection() {
  const { settings, updateRetrievalSettings } = useRagDashboard()

  return (
    <>
      {/* Language Override (Optional) */}
      <div className="space-y-3 p-4 rounded-lg border bg-card/30">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Translate className="size-4" weight="duotone" />
          </div>
          <div>
            <Label className="text-sm font-medium">Query Language</Label>
            <p className="text-xs text-muted-foreground">Override automatic language detection</p>
          </div>
        </div>
        <Select
          value={settings.retrieval.queryLanguage || "auto"}
          onValueChange={(value) =>
            updateRetrievalSettings({ queryLanguage: value === "auto" ? null : value })
          }
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Multilingual Features Info */}
      <div className="pt-4 border-t">
        <div className="flex gap-3 items-start p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0 mt-0.5" />
          <p>Multilingual features are automatically enabled: multilingual embeddings (multilingual-e5-large), BM25, language detection, and classification. These provide optimal multilingual support without manual configuration.</p>
        </div>
      </div>
    </>
  )
}
