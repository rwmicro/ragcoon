"use client"

import { useState, useEffect, useRef } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useModel } from "@/lib/model-store/provider"
import { Upload, FileText, FilePdf, X, CircleNotch } from "@phosphor-icons/react"
import { toast } from "sonner"

interface DialogCreateRAGProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export function DialogCreateRAG({ isOpen, setIsOpen }: DialogCreateRAGProps) {
  const [files, setFiles] = useState<File[]>([])
  const [llmModel, setLlmModel] = useState("llama3.1:latest")
  const [embeddingModel, setEmbeddingModel] = useState("nomic-embed-text")
  const [customPrompt, setCustomPrompt] = useState("")
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexProgress, setIndexProgress] = useState<string>("")
  const [indexingComplete, setIndexingComplete] = useState(false)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { models } = useModel()

  // Filtrer les modèles Ollama
  const ollamaModels = models.filter(
    (model) => model.providerId === "ollama"
  )

  // Auto-close dialog after successful indexing
  useEffect(() => {
    if (indexingComplete) {
      closeTimeoutRef.current = setTimeout(() => {
        setIsOpen(false)
        setIndexingComplete(false)
      }, 2000) // 2 seconds delay to show success message
    }

    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [indexingComplete, setIsOpen])

  // Reset states when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIndexingComplete(false)
      setIndexProgress("")
    }
  }, [isOpen])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(
        (file) =>
          file.name.endsWith(".md") ||
          file.name.endsWith(".pdf") ||
          file.name.endsWith(".txt")
      )

      if (newFiles.length === 0) {
        toast.error("Please select .md, .pdf, or .txt files")
        return
      }

      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Please add at least one document")
      return
    }

    if (!llmModel) {
      toast.error("Please select a LLM model")
      return
    }

    if (!embeddingModel) {
      toast.error("Please select an embedding model")
      return
    }

    setIsIndexing(true)
    setIndexProgress("Uploading documents...")

    try {
      console.log("Starting upload with:", {
        fileCount: files.length,
        llmModel,
        embeddingModel,
      })

      // Préparer les fichiers pour l'upload
      const formData = new FormData()
      files.forEach((file) => {
        console.log("Adding file:", file.name, file.type, file.size)
        formData.append("files", file)
      })
      formData.append("llmModel", llmModel)
      formData.append("embeddingModel", embeddingModel)
      formData.append("customPrompt", customPrompt)

      // Upload et indexation
      setIndexProgress("Processing and indexing documents...")

      console.log("Sending request to /api/rag/upload...")

      const response = await fetch("/api/rag/upload", {
        method: "POST",
        body: formData,
      })

      console.log("Response status:", response.status, response.statusText)

      if (!response.ok) {
        let errorMessage = "Failed to index documents"
        try {
          const error = await response.json()
          errorMessage = error.error || error.details || errorMessage
          console.error("Server error:", error)
        } catch (e) {
          console.error("Failed to parse error response:", e)
          const text = await response.text()
          console.error("Error response text:", text)
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log("Success result:", result)

      toast.success(
        `Successfully indexed ${result.totalChunks} chunks from ${result.filesProcessed} files`,
        {
          duration: 5000,
        }
      )

      // Reset form state
      setFiles([])
      setCustomPrompt("")
      setIndexProgress("")

      // Trigger auto-close via useEffect
      setIndexingComplete(true)
    } catch (error) {
      console.error("Error indexing documents:", error)

      // Plus de détails dans le message d'erreur
      let errorMessage = "Failed to index documents"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      toast.error(errorMessage, {
        duration: 5000,
      })
    } finally {
      setIsIndexing(false)
    }
  }

  const getFileIcon = (filename: string) => {
    if (filename.endsWith(".pdf")) {
      return <FilePdf size={20} className="text-red-500" />
    }
    return <FileText size={20} className="text-blue-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create RAG Knowledge Base</DialogTitle>
          <DialogDescription>
            Upload your documents and configure the RAG system to create your
            personalized AI assistant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Upload Section */}
          <div className="space-y-2">
            <Label>Documents</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                multiple
                accept=".md,.pdf,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={isIndexing}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload size={32} className="text-muted-foreground" />
                <div className="text-sm">
                  <span className="text-primary font-medium">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </div>
                <div className="text-xs text-muted-foreground">
                  Markdown, PDF, or TXT files
                </div>
              </label>
            </div>

            {/* Files List */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getFileIcon(file.name)}
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      disabled={isIndexing}
                      className="flex-shrink-0"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LLM Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="llm-model">LLM Model</Label>
            <Select
              value={llmModel}
              onValueChange={setLlmModel}
              disabled={isIndexing}
            >
              <SelectTrigger id="llm-model">
                <SelectValue placeholder="Select LLM model" />
              </SelectTrigger>
              <SelectContent>
                {ollamaModels.length > 0 ? (
                  ollamaModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="llama3.1:latest">
                    Llama 3.1 Latest
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Model used for generating responses
            </p>
          </div>

          {/* Embedding Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="embedding-model">Embedding Model</Label>
            <Select
              value={embeddingModel}
              onValueChange={setEmbeddingModel}
              disabled={isIndexing}
            >
              <SelectTrigger id="embedding-model">
                <SelectValue placeholder="Select embedding model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nomic-embed-text">
                  Nomic Embed Text (Recommended)
                </SelectItem>
                <SelectItem value="mxbai-embed-large">
                  MXBai Embed Large
                </SelectItem>
                <SelectItem value="all-minilm">All-MiniLM</SelectItem>
                <SelectItem value="snowflake-arctic-embed">
                  Snowflake Arctic Embed
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Model used for creating document embeddings
            </p>
          </div>

          {/* Custom Prompt */}
          <div className="space-y-2">
            <Label htmlFor="custom-prompt">
              Custom System Prompt (Optional)
            </Label>
            <Textarea
              id="custom-prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Enter a custom system prompt to guide the AI's responses..."
              className="min-h-[100px] resize-none"
              disabled={isIndexing}
            />
            <p className="text-xs text-muted-foreground">
              Define how the AI should behave when answering questions
            </p>
          </div>

          {/* Progress */}
          {isIndexing && (
            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
              <CircleNotch className="animate-spin" size={20} />
              <span className="text-sm">{indexProgress}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isIndexing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={files.length === 0 || isIndexing}
          >
            {isIndexing ? "Indexing..." : "Create RAG"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
