"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUser } from "@/lib/user-store/provider"
import { useAISettings } from "@/lib/ai-settings-store/provider"
import { useModel } from "@/lib/model-store/provider"
import { User, Info } from "@phosphor-icons/react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function UserProfile() {
  const { user } = useUser()
  const { settings, setDefaultModel, setAutoSendVoice, setMessageRetention } = useAISettings()
  const { models } = useModel()

  // Filter out RAG models for default model selection
  const selectableModels = models.filter(m => !m.id.startsWith('rag:'))

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-medium">Profile</h3>
        <div className="flex items-center space-x-4">
          <div className="bg-muted flex items-center justify-center overflow-hidden rounded-full">
            {user?.profile_image ? (
              <Avatar className="size-12">
                <AvatarImage src={user.profile_image} className="object-cover" />
                <AvatarFallback>{user?.display_name?.charAt(0)}</AvatarFallback>
              </Avatar>
            ) : (
              <User className="text-muted-foreground size-12" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium">{user?.display_name}</h4>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6 space-y-4">
        <h4 className="text-sm font-medium">Preferences</h4>

        {/* Default Model */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="defaultModel">Default Model</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Select which model to use by default when starting a new conversation</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Select
            value={settings.defaultModel || "none"}
            onValueChange={(value) => setDefaultModel(value === "none" ? null : value)}
          >
            <SelectTrigger id="defaultModel">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No default (ask each time)</SelectItem>
              {selectableModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Auto-send Voice */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="autoSendVoice" className="cursor-pointer">
              Auto-send Voice Messages
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Automatically send voice transcripts without manual confirmation</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="autoSendVoice"
            checked={settings.autoSendVoice}
            onCheckedChange={setAutoSendVoice}
          />
        </div>

        {/* Message Retention */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="messageRetention">Message Retention</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Maximum number of messages to keep in context. Higher values provide more
                    context but use more resources.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="messageRetention"
              type="number"
              value={settings.messageRetention}
              onChange={(e) => setMessageRetention(parseInt(e.target.value) || 50)}
              min={10}
              max={200}
              step={10}
              className="w-20 h-8"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Recommended: 50-100 messages for most conversations
          </p>
        </div>
      </div>
    </div>
  )
}
