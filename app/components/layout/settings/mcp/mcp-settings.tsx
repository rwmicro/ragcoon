"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { MCPConfig, MCPServerConfig, MCPTransportType } from "@/lib/mcp/config"
import {
  Plus,
  Trash,
  ToggleLeft,
  ToggleRight,
  Plugs,
  WarningCircle,
  Spinner,
  CheckCircle,
} from "@phosphor-icons/react"
import { useCallback, useEffect, useState } from "react"

type ServerEntry = { name: string } & MCPServerConfig

const TRANSPORT_LABELS: Record<MCPTransportType, string> = {
  stdio: "Stdio (local)",
  http: "HTTP (streamable)",
  sse: "SSE (remote)",
}

export function MCPSettings() {
  const [servers, setServers] = useState<ServerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state for adding a new server
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newTransport, setNewTransport] = useState<MCPTransportType>("stdio")
  const [newCommand, setNewCommand] = useState("")
  const [newArgs, setNewArgs] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [newHeaders, setNewHeaders] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mcp")
      const data: MCPConfig = await res.json()
      setServers(
        Object.entries(data.servers).map(([name, cfg]) => ({ name, ...cfg }))
      )
    } catch {
      setError("Could not load MCP configuration.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleToggle = async (name: string, enabled: boolean) => {
    setSaving(name)
    try {
      await fetch("/api/mcp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, enabled }),
      })
      setServers((prev) =>
        prev.map((s) => (s.name === name ? { ...s, enabled } : s))
      )
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (name: string) => {
    setSaving(name)
    try {
      await fetch("/api/mcp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      setServers((prev) => prev.filter((s) => s.name !== name))
    } finally {
      setSaving(null)
    }
  }

  const resetForm = () => {
    setNewName("")
    setNewTransport("stdio")
    setNewCommand("")
    setNewArgs("")
    setNewUrl("")
    setNewHeaders("")
    setFormError(null)
  }

  const handleAdd = async () => {
    if (!newName.trim()) return setFormError("Name is required.")
    if (servers.some((s) => s.name === newName.trim()))
      return setFormError("A server with this name already exists.")

    const isRemote = newTransport === "http" || newTransport === "sse"

    if (!isRemote && !newCommand.trim())
      return setFormError("Command is required for stdio transport.")
    if (isRemote && !newUrl.trim())
      return setFormError("URL is required for HTTP/SSE transport.")

    // Parse optional headers (JSON object or "Key: Value" lines)
    let parsedHeaders: Record<string, string> | undefined
    if (isRemote && newHeaders.trim()) {
      try {
        parsedHeaders = JSON.parse(newHeaders.trim())
      } catch {
        // Try "Key: Value" format
        parsedHeaders = {}
        for (const line of newHeaders.trim().split("\n")) {
          const idx = line.indexOf(":")
          if (idx === -1) return setFormError(`Invalid header line: "${line}"`)
          parsedHeaders[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
        }
      }
    }

    setFormError(null)
    setSaving("__new__")

    const server: MCPServerConfig = {
      transport: newTransport,
      enabled: true,
      ...(isRemote
        ? { url: newUrl.trim(), ...(parsedHeaders ? { headers: parsedHeaders } : {}) }
        : {
            command: newCommand.trim(),
            args: newArgs.trim() ? newArgs.trim().split(/\s+/) : [],
          }),
    }

    try {
      await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), server }),
      })
      setServers((prev) => [...prev, { name: newName.trim(), ...server }])
      resetForm()
      setShowForm(false)
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Spinner className="size-4 animate-spin" />
        <span className="text-sm">Loading MCP servers...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive py-4">
        <WarningCircle className="size-4" />
        <span className="text-sm">{error}</span>
        <Button variant="ghost" size="sm" onClick={load}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Server list */}
      {servers.length === 0 && !showForm && (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
          <Plugs className="size-8 opacity-40" weight="duotone" />
          <p className="text-sm">No MCP servers configured yet.</p>
          <p className="text-xs opacity-70">
            Add a server to give the model access to external tools.
          </p>
        </div>
      )}

      {servers.map((server) => {
        const isEnabled = server.enabled !== false
        const isSaving = saving === server.name
        const transportType = server.transport ?? "stdio"
        const isRemote = transportType === "http" || transportType === "sse"

        return (
          <div
            key={server.name}
            className={cn(
              "flex items-start justify-between rounded-lg border p-3 gap-3",
              isEnabled ? "border-border" : "border-border/50 opacity-60"
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{server.name}</span>
                <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {TRANSPORT_LABELS[transportType]}
                </span>
                {isEnabled && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-1.5 py-0.5 text-[10px] text-green-700 dark:text-green-400">
                    <CheckCircle className="size-2.5" weight="fill" />
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                {isRemote
                  ? server.url
                  : `${server.command ?? ""} ${(server.args ?? []).join(" ")}`.trim()}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleToggle(server.name, !isEnabled)}
                disabled={!!saving}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 disabled:opacity-50"
                title={isEnabled ? "Disable" : "Enable"}
              >
                {isSaving ? (
                  <Spinner className="size-4 animate-spin" />
                ) : isEnabled ? (
                  <ToggleRight className="size-5 text-primary" weight="fill" />
                ) : (
                  <ToggleLeft className="size-5" />
                )}
              </button>
              <button
                onClick={() => handleDelete(server.name)}
                disabled={!!saving}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 disabled:opacity-50"
                title="Delete"
              >
                <Trash className="size-4" />
              </button>
            </div>
          </div>
        )
      })}

      {/* Add server form */}
      {showForm && (
        <div className="rounded-lg border border-dashed p-4 space-y-3">
          <p className="text-sm font-medium">New MCP Server</p>
          <div className="space-y-2">
            <Input
              placeholder="Name (e.g. filesystem)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="text-sm h-8"
            />

            {/* Transport selector */}
            <div className="flex gap-1">
              {(["stdio", "http", "sse"] as MCPTransportType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewTransport(t)}
                  className={cn(
                    "flex-1 rounded-md border px-2 py-1 text-xs transition-colors",
                    newTransport === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {TRANSPORT_LABELS[t]}
                </button>
              ))}
            </div>

            {/* Stdio fields */}
            {newTransport === "stdio" && (
              <>
                <Input
                  placeholder="Command (e.g. npx)"
                  value={newCommand}
                  onChange={(e) => setNewCommand(e.target.value)}
                  className="text-sm h-8 font-mono"
                />
                <Input
                  placeholder="Args (e.g. -y @modelcontextprotocol/server-filesystem /tmp)"
                  value={newArgs}
                  onChange={(e) => setNewArgs(e.target.value)}
                  className="text-sm h-8 font-mono"
                />
              </>
            )}

            {/* HTTP / SSE fields */}
            {(newTransport === "http" || newTransport === "sse") && (
              <>
                <Input
                  placeholder={`URL (e.g. https://mcp.example.com/${newTransport === "sse" ? "sse" : "mcp"})`}
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="text-sm h-8 font-mono"
                />
                <Input
                  placeholder='Headers — JSON {"Authorization":"Bearer ..."} or "Key: Value" lines (optional)'
                  value={newHeaders}
                  onChange={(e) => setNewHeaders(e.target.value)}
                  className="text-sm h-8 font-mono"
                />
              </>
            )}
          </div>

          {formError && (
            <p className="text-xs text-destructive">{formError}</p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={saving === "__new__"}
            >
              {saving === "__new__" ? (
                <Spinner className="size-3 animate-spin mr-1" />
              ) : null}
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!showForm && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowForm(true)}
        >
          <Plus className="size-3.5" />
          Add server
        </Button>
      )}

      {servers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Changes take effect on the next message.
        </p>
      )}
    </div>
  )
}
