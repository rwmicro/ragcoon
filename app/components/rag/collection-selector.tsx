"use client"

import { useEffect, useState } from "react"
import { Check, ChevronsUpDown, Database, X, Pencil, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { listCollections, RAGCollection, renameCollection, checkHealth } from "@/lib/api/rag"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface CollectionSelectorProps {
    selectedCollectionId: string
    onSelectCollection: (id: string) => void
    className?: string
}

export function CollectionSelector({
    selectedCollectionId,
    onSelectCollection,
    className,
}: CollectionSelectorProps) {
    const [open, setOpen] = useState(false)
    const [collections, setCollections] = useState<RAGCollection[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [renamingCollection, setRenamingCollection] = useState<RAGCollection | null>(null)
    const [newTitle, setNewTitle] = useState("")
    const [isRenaming, setIsRenaming] = useState(false)
    const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null)

    useEffect(() => {
        checkHealth().then((result) => {
            setBackendAvailable(result.status !== "unhealthy")
        })
    }, [])

    useEffect(() => {
        const fetchCollections = async () => {
            setIsLoading(true)
            try {
                const result = await listCollections()
                setCollections(result.collections)
            } catch (error) {
                console.error("Failed to load collections", error)
            } finally {
                setIsLoading(false)
            }
        }

        if (open) {
            fetchCollections()
        }
    }, [open])

    // Also fetch once on mount to get the name of the selected collection if any
    useEffect(() => {
        if (selectedCollectionId && collections.length === 0) {
            listCollections().then(res => setCollections(res.collections)).catch(console.error)
        }
    }, [selectedCollectionId])

    const selectedCollection = collections.find(
        (collection) => collection.id === selectedCollectionId
    )

    const handleRename = async () => {
        if (!renamingCollection || !newTitle.trim()) return

        setIsRenaming(true)
        try {
            await renameCollection(renamingCollection.id, newTitle)
            toast.success("Collection renamed")

            // Refresh list
            const result = await listCollections()
            setCollections(result.collections)

            setRenamingCollection(null)
        } catch (error) {
            toast.error("Failed to rename collection")
            console.error(error)
        } finally {
            setIsRenaming(false)
        }
    }

    if (backendAvailable === false) return null

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn("h-9 justify-between rounded-full px-3 border-dashed",
                            selectedCollectionId ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20" : "text-muted-foreground",
                            className
                        )}
                    >
                        <div className="flex items-center gap-2 truncate">
                            <Database className="size-4 shrink-0" />
                            <span className="truncate max-w-[120px]">
                                {selectedCollection ? selectedCollection.title : "Select KB"}
                            </span>
                        </div>
                        {selectedCollectionId ? (
                            <div
                                role="button"
                                className="ml-2 rounded-full p-0.5 hover:bg-primary/20"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSelectCollection("")
                                }}
                            >
                                <X className="size-3" />
                            </div>
                        ) : (
                            <ChevronsUpDown className="ml-2 size-3 shrink-0 opacity-50" />
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search knowledge base..." />
                        <CommandList>
                            <CommandEmpty>No knowledge base found.</CommandEmpty>
                            <CommandGroup heading="Available Knowledge Bases">
                                {collections.map((collection) => (
                                    <CommandItem
                                        key={collection.id}
                                        value={collection.title}
                                        onSelect={() => {
                                            onSelectCollection(collection.id === selectedCollectionId ? "" : collection.id)
                                            setOpen(false)
                                        }}
                                        className="group"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 size-4",
                                                selectedCollectionId === collection.id
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="truncate">{collection.title}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {collection.file_count} files • {collection.embedding_model}
                                            </span>
                                        </div>
                                        <div
                                            role="button"
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setRenamingCollection(collection)
                                                setNewTitle(collection.title)
                                            }}
                                        >
                                            <Pencil className="size-3 text-muted-foreground" />
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Dialog open={!!renamingCollection} onOpenChange={(open) => !open && setRenamingCollection(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Collection</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="name" className="mb-2 block">Name</Label>
                        <Input
                            id="name"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Collection Name"
                            onKeyDown={(e) => e.key === "Enter" && handleRename()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenamingCollection(null)}>Cancel</Button>
                        <Button onClick={handleRename} disabled={isRenaming || !newTitle.trim()}>
                            {isRenaming && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
