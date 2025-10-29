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
  StarIcon,
} from "@phosphor-icons/react"
import { useRef, useState } from "react"
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
  const [isProDialogOpen, setIsProDialogOpen] = useState(false)
  const [selectedProModel, setSelectedProModel] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

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
    const isLocked = !model.accessible
    const provider = PROVIDERS.find((provider) => provider.id === model.icon)

    return (
      <div
        key={model.id}
        className={cn(
          "flex w-full items-center justify-between px-3 py-2",
          selectedModelId === model.id && "bg-accent"
        )}
        onClick={() => {
          if (isLocked) {
            setSelectedProModel(model.id)
            setIsProDialogOpen(true)
            return
          }

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
        {isLocked && (
          <div className="border-input bg-accent text-muted-foreground flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium">
            <StarIcon className="size-2" />
            <span>Locked</span>
          </div>
        )}
      </div>
    )
  }

  // Get the hovered model data
  const hoveredModelData = models.find((model) => model.id === hoveredModel)

  const filteredModels = filterAndSortModels(
    models,
    searchQuery,
    isModelHidden
  )

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
                        className={cn(
                          "size-4",
                          isRefreshing && "animate-spin"
                        )}
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
                  <p className="text-muted-foreground mb-2 text-sm p-6 text-center">
                    No results found.
                  </p>
              )}
            </div>
          </DrawerContent>
        </Drawer>
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
                    className="dark:bg-popover rounded-b-none rounded-r-none border border-none pl-8 shadow-none focus-visible:ring-0"
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
                      className="shrink-0 rounded-l-none rounded-br-none border-none shadow-none h-10 w-10"
                    >
                      <ArrowClockwise
                        className={cn(
                          "size-4",
                          isRefreshing && "animate-spin"
                        )}
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
                  const isLocked = !model.accessible
                  const provider = PROVIDERS.find(
                    (provider) => provider.id === model.icon
                  )

                  return (
                    <DropdownMenuItem
                      key={model.id}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2",
                        selectedModelId === model.id && "bg-accent"
                      )}
                      onSelect={() => {
                        if (isLocked) {
                          setSelectedProModel(model.id)
                          setIsProDialogOpen(true)
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
                      {isLocked && (
                        <div className="border-input bg-accent text-muted-foreground flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium">
                          <span>Locked</span>
                        </div>
                      )}
                    </DropdownMenuItem>
                  )
                })
              ) : (
                  <p className="text-muted-foreground mb-1 text-sm p-6 text-center">
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
    </div>
  )
}
