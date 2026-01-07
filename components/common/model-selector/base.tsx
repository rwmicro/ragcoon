"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useKeyShortcut } from "@/app/hooks/use-key-shortcut"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useModel } from "@/lib/model-store/provider"
import { filterAndSortModels } from "@/lib/model-store/utils"
import { ModelConfig } from "@/lib/models/types"
import { PROVIDERS } from "@/lib/providers"
import { cn } from "@/lib/utils"
import {
  ArrowClockwise,
  CaretDownIcon,
  MagnifyingGlassIcon,
  PencilSimple,
  StarIcon,
  Trash,
} from "@phosphor-icons/react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { EditRagTitleDialog } from "./edit-rag-title-dialog"
import { DialogEditCollection } from "@/app/components/rag/dialog-edit-collection"
import { SubMenu } from "./sub-menu"

type ModelSelectorProps = {
  selectedModelId: string
  setSelectedModelId: (modelId: string) => void
  className?: string
}

export function ModelSelector({
  selectedModelId,
  setSelectedModelId,
  className,
}: ModelSelectorProps) {
  const { models, isLoading: isLoadingModels, refreshModels } = useModel()

  // Default implementation for model visibility
  const isModelHidden = () => false

  const currentModel = models.find((model) => model.id === selectedModelId)
  const currentProvider = PROVIDERS.find(
    (provider) => provider.id === currentModel?.icon
  )
  const isMobile = useBreakpoint(768)

  const [hoveredModel, setHoveredModel] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [editRagTitleOpen, setEditRagTitleOpen] = useState(false)
  const [ragModelToEdit, setRagModelToEdit] = useState<ModelConfig | null>(null)
  const [editCollectionOpen, setEditCollectionOpen] = useState(false)
  const [collectionToEdit, setCollectionToEdit] = useState<string | null>(null)

  // Ref for input to maintain focus
  const searchInputRef = useRef<HTMLInputElement>(null)

  useKeyShortcut(
    (e) => (e.key === "p" || e.key === "P") && e.metaKey && e.shiftKey,
    () => {
      if (isMobile) {
        setIsDrawerOpen((prev) => !prev)
      } else {
        setIsDropdownOpen((prev) => !prev)
      }
    }
  )

  const renderModelItem = (model: ModelConfig) => {
    const provider = PROVIDERS.find((provider) => provider.id === model.icon)
    const isRagModel = model.id.startsWith('rag:')

    return (
      <div
        key={model.id}
        className={cn(
          "group flex w-full items-center justify-between px-3 py-2",
          selectedModelId === model.id && "bg-accent"
        )}
        onClick={() => {
          setSelectedModelId(model.id)
          if (isMobile) {
            setIsDrawerOpen(false)
          } else {
            setIsDropdownOpen(false)
          }
        }}
      >
        <div className="flex items-center gap-3">
          {provider?.icon && <provider.icon className="size-5" />}
          <div className="flex flex-col gap-0">
            <span className="text-sm">{model.name}</span>
          </div>
        </div>
        {isRagModel && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                const collectionId = model.id.replace('rag:', '')
                setCollectionToEdit(collectionId)
                setEditCollectionOpen(true)
              }}
              className="p-1 hover:bg-muted rounded"
              title="Edit collection models"
            >
              <PencilSimple className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
            <button
              onClick={(e) => handleDeleteRag(model, e)}
              className="p-1 hover:bg-muted rounded"
              title="Delete RAG"
            >
              <Trash className="size-4 text-red-500 hover:text-red-600" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // Get the hovered model data
  const hoveredModelData = models.find((model) => model.id === hoveredModel)

  const filteredModels = filterAndSortModels(models, searchQuery, isModelHidden)

  const trigger = (
    <Button
      variant="outline"
      className={cn("dark:bg-secondary justify-between", className)}
      disabled={Boolean(isLoadingModels)}
    >
      <div className="flex items-center gap-2">
        {currentProvider?.icon && <currentProvider.icon className="size-5" />}
        <span>{currentModel?.name || "Select model"}</span>
      </div>
      <CaretDownIcon className="size-4 opacity-50" />
    </Button>
  )

  // Handle input change without losing focus
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    setSearchQuery(e.target.value)
  }

  // Handle refresh models
  const handleRefreshModels = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsRefreshing(true)
    try {
      await refreshModels()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle delete RAG collection
  const handleDeleteRag = async (model: ModelConfig, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (!model.collectionName) {
      toast.error('Cannot delete: collection name not found')
      return
    }

    if (!confirm(`Are you sure you want to delete "${model.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/rag/collections?name=${encodeURIComponent(model.collectionName)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to delete collection')
      }

      toast.success(`Successfully deleted "${model.name}"`)

      // If the deleted model was selected, switch to first available model
      if (selectedModelId === model.id) {
        const otherModels = models.filter(m => m.id !== model.id)
        if (otherModels.length > 0) {
          setSelectedModelId(otherModels[0].id)
        }
      }

      // Refresh models list
      await refreshModels()
    } catch (error) {
      console.error('Error deleting RAG collection:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete collection')
    }
  }

  if (isMobile) {
    return (
      <>
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Select Model</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search models..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRefreshModels}
                      disabled={isRefreshing || isLoadingModels}
                      className="shrink-0"
                    >
                      <ArrowClockwise
                        className={cn("size-4", isRefreshing && "animate-spin")}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh Models</TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="flex h-full flex-col space-y-0 overflow-y-auto px-4 pb-6">
              {isLoadingModels ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="text-muted-foreground mb-2 text-sm">
                    Loading models...
                  </p>
                </div>
              ) : filteredModels.length > 0 ? (
                filteredModels.map((model) => renderModelItem(model))
              ) : (
                <p className="text-muted-foreground mb-2 p-6 text-center text-sm">
                  No results found.
                </p>
              )}
            </div>
          </DrawerContent>
        </Drawer>

        {/* Edit RAG Title Dialog */}
        {ragModelToEdit && (
          <EditRagTitleDialog
            open={editRagTitleOpen}
            onOpenChange={setEditRagTitleOpen}
            currentTitle={ragModelToEdit.name}
            onTitleUpdated={async () => {
              // Refresh models to show updated title
              await refreshModels()
            }}
          />
        )}
      </>
    )
  }

  return (
    <div>
      <Tooltip>
        <DropdownMenu
          open={isDropdownOpen}
          onOpenChange={(open) => {
            setIsDropdownOpen(open)
            if (!open) {
              setHoveredModel(null)
              setSearchQuery("")
            } else {
              if (selectedModelId) setHoveredModel(selectedModelId)
            }
          }}
        >
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Switch model ⌘⇧P</TooltipContent>
          <DropdownMenuContent
            className="flex h-[320px] w-[300px] flex-col space-y-0.5 overflow-visible p-0"
            align="start"
            sideOffset={4}
            forceMount
            side="top"
          >
            <div className="bg-background sticky top-0 z-10 rounded-t-md border-b px-0 pt-0 pb-0">
              <div className="flex">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search models..."
                    className="dark:bg-popover rounded-r-none rounded-b-none border border-none pl-8 shadow-none focus-visible:ring-0"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRefreshModels}
                      disabled={isRefreshing || isLoadingModels}
                      className="h-10 w-10 shrink-0 rounded-l-none rounded-br-none border-none shadow-none"
                    >
                      <ArrowClockwise
                        className={cn("size-4", isRefreshing && "animate-spin")}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh Models</TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="flex h-full flex-col space-y-0 overflow-y-auto px-1 pt-0 pb-0">
              {isLoadingModels ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="text-muted-foreground mb-2 text-sm">
                    Loading models...
                  </p>
                </div>
              ) : filteredModels.length > 0 ? (
                filteredModels.map((model) => {
                  const provider = PROVIDERS.find(
                    (provider) => provider.id === model.icon
                  )
                  const isRagModel = model.id.startsWith('rag:')
                  return (
                    <DropdownMenuItem
                      key={model.id}
                      className={cn(
                        "group flex w-full items-center justify-between px-3 py-2",
                        selectedModelId === model.id && "bg-accent"
                      )}
                      onSelect={(e) => {
                        // Don't select if clicking edit button
                        const target = e.target as HTMLElement
                        if (target.closest('[data-edit-button]')) {
                          return
                        }
                        setSelectedModelId(model.id)
                        setIsDropdownOpen(false)
                      }}
                      onFocus={() => {
                        if (isDropdownOpen) {
                          setHoveredModel(model.id)
                        }
                      }}
                      onMouseEnter={() => {
                        if (isDropdownOpen) {
                          setHoveredModel(model.id)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {provider?.icon && <provider.icon className="size-5" />}
                        <div className="flex flex-col gap-0">
                          <span className="text-sm">{model.name}</span>
                        </div>
                      </div>
                      {isRagModel && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            data-edit-button
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              setRagModelToEdit(model)
                              setEditRagTitleOpen(true)
                            }}
                            className="p-1 hover:bg-muted rounded"
                            title="Edit RAG title"
                          >
                            <PencilSimple className="size-4 text-muted-foreground hover:text-foreground" />
                          </button>
                          <button
                            data-edit-button
                            onClick={(e) => handleDeleteRag(model, e)}
                            className="p-1 hover:bg-muted rounded"
                            title="Delete RAG"
                          >
                            <Trash className="size-4 text-red-500 hover:text-red-600" />
                          </button>
                        </div>
                      )}
                    </DropdownMenuItem>
                  )
                })
              ) : (
                <p className="text-muted-foreground mb-1 p-6 text-center text-sm">
                  No results found.
                </p>
              )}
            </div>

            {/* Submenu positioned absolutely */}
            {hoveredModelData && (
              <div className="absolute top-0 left-[calc(100%+8px)]">
                <SubMenu hoveredModelData={hoveredModelData} />
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>

      {/* Edit RAG Title Dialog */}
      {ragModelToEdit && (
        <EditRagTitleDialog
          open={editRagTitleOpen}
          onOpenChange={setEditRagTitleOpen}
          currentTitle={ragModelToEdit.name}
          onTitleUpdated={async () => {
            // Refresh models to show updated title
            await refreshModels()
          }}
        />
      )}

      {/* Edit Collection Models Dialog */}
      {collectionToEdit && (
        <DialogEditCollection
          isOpen={editCollectionOpen}
          setIsOpen={setEditCollectionOpen}
          collectionId={collectionToEdit}
          onUpdated={async () => {
            // Refresh models to show updated configuration
            await refreshModels()
          }}
        />
      )}
    </div>
  )
}
