"use client"

import { Button } from "@/components/ui/button"
import { DrawerClose } from "@/components/ui/drawer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, isDev } from "@/lib/utils"
import {
  GearSixIcon,
  PaintBrushIcon,
  PlugsConnectedIcon,
  XIcon,
  Microphone,
  Database,
  ListBullets,
  Plugs,
} from "@phosphor-icons/react"
import { useState } from "react"
import { InteractionPreferences } from "./appearance/interaction-preferences"
import { LayoutSettings } from "./appearance/layout-settings"
import { ThemeSelection } from "./appearance/theme-selection"
import { ConnectionsPlaceholder } from "./connections/connections-placeholder"
import { DeveloperTools } from "./connections/developer-tools"
import { OllamaSection } from "./connections/ollama-section"
import { UserProfile } from "./general/user-profile"
import { AIBehavior } from "./general/ai-behavior"
import { AgenticSettings } from "./general/agentic-settings"
import { SystemPromptSection } from "./general/system-prompt"
// import { RAGSettings } from "./general/rag-settings" // REMOVED: All RAG settings are now in dedicated RAG Dashboard (/rag)
import { VoiceSettings } from "./voice/voice-settings"
import { EnvConfigPanel } from "./backend/env-config"
import { ModelVisibilitySettings } from "./models/model-visibility-settings"
import { MCPSettings } from "./mcp/mcp-settings"

type SettingsContentProps = {
  isDrawer?: boolean
}

type TabType = "general" | "appearance" | "connections" | "models" | "voice" | "backend" | "mcp"

export function SettingsContent({
  isDrawer = false,
}: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>("general")

  const SidebarItem = ({
    value,
    icon: Icon,
    label,
    description,
  }: {
    value: TabType
    icon: any
    label: string
    description?: string
  }) => (
    <TabsTrigger
      value={value}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 group",
        "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/20",
        "hover:bg-muted/50 text-muted-foreground hover:text-foreground justify-start"
      )}
    >
      <div className={cn(
        "size-8 rounded-md flex items-center justify-center shrink-0 transition-colors",
        activeTab === value ? "bg-primary/20 text-primary" : "bg-muted group-hover:bg-muted/80"
      )}>
        <Icon className="size-4" weight={activeTab === value ? "duotone" : "regular"} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <span className={cn("text-sm font-medium truncate", activeTab === value && "font-semibold")}>{label}</span>
        </div>
        {description && <p className="text-[10px] opacity-80 truncate">{description}</p>}
      </div>
    </TabsTrigger>
  )

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden",
        isDrawer ? "p-0 pb-16 h-full" : "h-full"
      )}
    >
      {isDrawer && (
        <div className="border-border mb-2 flex items-center justify-between border-b px-4 pb-2 shrink-0">
          <h2 className="text-lg font-medium">Settings</h2>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon">
              <XIcon className="size-4" />
            </Button>
          </DrawerClose>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabType)}
        className={cn(
          "flex w-full flex-row overflow-hidden",
          isDrawer ? "flex-col h-full" : "h-full"
        )}
      >
        {isDrawer ? (
          // Mobile version - tabs on top
          <div className="w-full flex flex-col h-full">
            <div className="shrink-0">
              <TabsList className="mb-4 flex w-full min-w-0 flex-nowrap items-center justify-start overflow-x-auto bg-transparent px-0 pb-2">
                <TabsTrigger
                  value="general"
                  className="ml-6 flex shrink-0 items-center gap-2"
                >
                  <GearSixIcon className="size-4" />
                  <span>General</span>
                </TabsTrigger>
                <TabsTrigger
                  value="appearance"
                  className="flex shrink-0 items-center gap-2"
                >
                  <PaintBrushIcon className="size-4" />
                  <span>Appearance</span>
                </TabsTrigger>
                <TabsTrigger
                  value="connections"
                  className="flex shrink-0 items-center gap-2"
                >
                  <PlugsConnectedIcon className="size-4" />
                  <span>Connections</span>
                </TabsTrigger>
                <TabsTrigger
                  value="models"
                  className="flex shrink-0 items-center gap-2"
                >
                  <ListBullets className="size-4" />
                  <span>Models</span>
                </TabsTrigger>
                <TabsTrigger
                  value="voice"
                  className="flex shrink-0 items-center gap-2"
                >
                  <Microphone className="size-4" />
                  <span>Voice</span>
                </TabsTrigger>
                <TabsTrigger
                  value="backend"
                  className="flex shrink-0 items-center gap-2"
                >
                  <GearSixIcon className="size-4" />
                  <span>Backend</span>
                </TabsTrigger>
                <TabsTrigger
                  value="mcp"
                  className="flex shrink-0 items-center gap-2"
                >
                  <Plugs className="size-4" />
                  <span>MCP</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Mobile tabs content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <TabsContent value="general" className="space-y-6 mt-0">
                <UserProfile />
                <AIBehavior />
                <AgenticSettings />
                <SystemPromptSection />
              </TabsContent>

              <TabsContent value="appearance" className="space-y-6 mt-0">
                <ThemeSelection />
                <LayoutSettings />
                <InteractionPreferences />
              </TabsContent>

              <TabsContent value="connections" className="space-y-6 mt-0">
                {!isDev && <ConnectionsPlaceholder />}
                {isDev && <OllamaSection />}
                {isDev && <DeveloperTools />}
              </TabsContent>

              <TabsContent value="models" className="space-y-6 mt-0">
                <ModelVisibilitySettings />
              </TabsContent>

              <TabsContent value="voice" className="space-y-6 mt-0">
                <VoiceSettings />
              </TabsContent>

              <TabsContent value="backend" className="space-y-6 mt-0">
                <EnvConfigPanel />
              </TabsContent>

              <TabsContent value="mcp" className="space-y-6 mt-0">
                <MCPSettings />
              </TabsContent>
            </div>
          </div>
        ) : (
          // Desktop version - Sidebar Layout
          <>
            <div className="w-64 bg-muted/30 border-r p-4 flex flex-col gap-6 shrink-0">
              <div className="px-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GearSixIcon className="size-5 text-primary" weight="duotone" />
                  </div>
                  <span className="font-semibold tracking-tight">Settings</span>
                </div>
                <p className="text-xs text-muted-foreground pl-10">Manage preferences</p>
              </div>

              <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-1">
                <SidebarItem
                  value="general"
                  icon={GearSixIcon}
                  label="General"
                  description="Profile & Behavior"
                />
                <SidebarItem
                  value="appearance"
                  icon={PaintBrushIcon}
                  label="Appearance"
                  description="Theme & Layout"
                />
                <SidebarItem
                  value="connections"
                  icon={PlugsConnectedIcon}
                  label="Connections"
                  description="Models & API"
                />
                <SidebarItem
                  value="models"
                  icon={ListBullets}
                  label="Models"
                  description="Model Visibility"
                />
                <SidebarItem
                  value="voice"
                  icon={Microphone}
                  label="Voice"
                  description="TTS & STT"
                />
                <SidebarItem
                  value="backend"
                  icon={GearSixIcon}
                  label="Backend"
                  description="Environment Config"
                />
                <SidebarItem
                  value="mcp"
                  icon={Plugs}
                  label="MCP"
                  description="External Tool Servers"
                />
              </TabsList>
            </div>

            {/* Desktop tabs content */}
            <div className="flex-1 overflow-y-auto bg-background p-8">
              <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                <TabsContent value="general" className="mt-0 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">General Settings</h2>
                    <p className="text-sm text-muted-foreground">Manage your profile and AI behavior.</p>
                  </div>
                  <UserProfile />
                  <AIBehavior />
                  <AgenticSettings />
                  <SystemPromptSection />
                </TabsContent>

                <TabsContent value="appearance" className="mt-0 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">Appearance</h2>
                    <p className="text-sm text-muted-foreground">Customize the look and feel of the application.</p>
                  </div>
                  <ThemeSelection />
                  <LayoutSettings />
                  <InteractionPreferences />
                </TabsContent>

                <TabsContent value="connections" className="mt-0 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">Connections</h2>
                    <p className="text-sm text-muted-foreground">Configure external models and APIs.</p>
                  </div>
                  {!isDev && <ConnectionsPlaceholder />}
                  {isDev && <OllamaSection />}
                  {isDev && <DeveloperTools />}
                </TabsContent>

                <TabsContent value="models" className="mt-0 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">Model Visibility</h2>
                    <p className="text-sm text-muted-foreground">Control which models appear in the model selector.</p>
                  </div>
                  <ModelVisibilitySettings />
                </TabsContent>

                <TabsContent value="voice" className="mt-0 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">Voice Interaction</h2>
                    <p className="text-sm text-muted-foreground">Configure text-to-speech and speech-to-text.</p>
                  </div>
                  <VoiceSettings />
                </TabsContent>

                <TabsContent value="backend" className="mt-0 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">Backend Configuration</h2>
                    <p className="text-sm text-muted-foreground">Manage RAG backend environment variables.</p>
                  </div>
                  <EnvConfigPanel />
                </TabsContent>

                <TabsContent value="mcp" className="mt-0 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">MCP Servers</h2>
                    <p className="text-sm text-muted-foreground">
                      Connect external tool servers via the Model Context Protocol. Each enabled server exposes its tools to the model.
                    </p>
                  </div>
                  <MCPSettings />
                </TabsContent>
              </div>
            </div>
          </>
        )}
      </Tabs>
    </div>
  )
}
