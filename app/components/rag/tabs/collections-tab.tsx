"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TabsContent } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
import {
  Database,
  Plus,
  Trash,
  PencilSimple,
  Cpu,
  Lightning,
  FileText,
  X,
  CircleNotch,
  Check,
  Folder,
  Globe,
} from "@phosphor-icons/react"
import { useRagDashboard } from "../rag-dashboard-context"

export function CollectionsTab() {
  const {
    collections,
    isLoadingCollections,
    showCreationForm,
    setShowCreationForm,
    collectionTitle,
    setCollectionTitle,
    uploadQueue,
    isUploading,
    urlInput,
    setUrlInput,
    handleFileChange,
    handleFolderChange,
    handleAddUrl,
    handleUploadAll,
    removeFromQueue,
    clearUploadQueue,
    handleDeleteCollection,
    setEditingCollectionId,
    fileInputRef,
    folderInputRef,
  } = useRagDashboard()

  return (
    <TabsContent value="collections" className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Collections</h2>
        <Button onClick={() => setShowCreationForm(!showCreationForm)} size="sm">
          <Plus className="size-4 mr-2" />
          New Collection
        </Button>
      </div>

      {/* Creation Form */}
      <AnimatePresence>
        {showCreationForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border rounded-xl overflow-hidden"
          >
            <div className="bg-muted/30 p-4 border-b">
              <h3 className="font-semibold">Create New Collection</h3>
            </div>
            <div className="p-6 space-y-6">
              {/* Collection Title */}
              <div className="space-y-2">
                <Label>Collection Title *</Label>
                <Input
                  value={collectionTitle}
                  onChange={(e) => setCollectionTitle(e.target.value)}
                  placeholder="e.g., My Documentation"
                />
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <Label>Documents</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <FileText className="size-4 mr-2" />
                    Files
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}>
                    <Folder className="size-4 mr-2" />
                    Folder
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.md,.markdown,.csv,.tsv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  onChange={handleFolderChange}
                  className="hidden"
                  {...({ webkitdirectory: "", directory: "" } as any)}
                />
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <Label>Add URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/docs"
                    onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddUrl}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Upload Queue */}
              {uploadQueue.length > 0 && (
                <div className="space-y-2">
                  <Label>Queue ({uploadQueue.length})</Label>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {uploadQueue.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {item.type === "url" ? (
                            <Globe className="size-4 shrink-0" />
                          ) : (
                            <FileText className="size-4 shrink-0" />
                          )}
                          <span className="text-sm truncate">{item.type === "url" ? item.url : item.file.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === "success" && <Check className="size-4 text-green-500" />}
                          {item.status === "uploading" && <CircleNotch className="size-4 animate-spin" />}
                          {item.status === "error" && <X className="size-4 text-red-500" />}
                          {item.status === "pending" && (
                            <Button variant="ghost" size="icon" className="size-6" onClick={() => removeFromQueue(item.id)}>
                              <X className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreationForm(false)
                    setCollectionTitle("")
                    clearUploadQueue()
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleUploadAll} disabled={isUploading || uploadQueue.length === 0 || !collectionTitle.trim()}>
                  {isUploading ? (
                    <>
                      <CircleNotch className="size-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="size-4 mr-2" />
                      Create Collection
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collections List */}
      {isLoadingCollections ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <CircleNotch className="size-6 animate-spin mr-2" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : collections.length > 0 ? (
        <div className="grid gap-3">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/5 transition-all hover:shadow-sm group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{collection.title}</h4>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {collection.file_count} files
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md">
                    <Cpu className="size-3" />
                    {collection.llm_model}
                  </span>
                  <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md">
                    <Lightning className="size-3" />
                    {collection.embedding_model}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => setEditingCollectionId(collection.id)}
                >
                  <PencilSimple className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteCollection(collection.id)}
                >
                  <Trash className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/10 flex flex-col items-center justify-center">
          <div className="size-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
            <Database className="size-6 text-muted-foreground/50" />
          </div>
          <h3 className="text-sm font-medium mb-1">No Collections</h3>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Create a new collection to start chatting with your documents.
          </p>
        </div>
      )}
    </TabsContent>
  )
}
