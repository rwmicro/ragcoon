import {
  FileUpload,
  FileUploadContent,
  FileUploadTrigger,
} from "@/components/prompt-kit/file-upload"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useModel } from "@/lib/model-store/provider"
import { FileArrowUp, Paperclip } from "@phosphor-icons/react"
import React from "react"

type ButtonFileUploadProps = {
  onFileUpload: (files: File[]) => void
  model: string
}

export function ButtonFileUpload({
  onFileUpload,
  model,
}: ButtonFileUploadProps) {
  const { models } = useModel()
  const currentModel = models.find((m) => m.id === model)


  return (
    <FileUpload
      onFilesAdded={onFileUpload}
      multiple
      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.txt,.md,.csv,.json,.xml,.yaml,.yml,.toml,.py,.js,.ts,.jsx,.tsx,.html,.css,.scss,.java,.c,.cpp,.h,.cs,.go,.rs,.rb,.php,.sh,.bash,.zsh,.sql"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <FileUploadTrigger asChild>
            <Button
              size="sm"
              variant="secondary"
              className="border-border dark:bg-secondary size-9 rounded-full border bg-transparent"
              type="button"
              aria-label="Add files"
            >
              <Paperclip className="size-4" />
            </Button>
          </FileUploadTrigger>
        </TooltipTrigger>
        <TooltipContent>Add files</TooltipContent>
      </Tooltip>
      <FileUploadContent>
        <div className="border-input bg-background flex flex-col items-center rounded-lg border border-dashed p-8">
          <FileArrowUp className="text-muted-foreground size-8" />
          <span className="mt-4 mb-1 text-lg font-medium">Drop files here</span>
          <span className="text-muted-foreground text-sm">
            Drop any files here to add it to the conversation
          </span>
        </div>
      </FileUploadContent>
    </FileUpload>
  )
}
