"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { useState } from "react"

export function LMStudioSection() {
  const [endpoint, setEndpoint] = useState("http://0.0.0.0:1234")
  const [enabled, setEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  // In client-side, we assume development mode unless it's a production build
  const isLocked =
    typeof window !== "undefined" && window.location.hostname !== "localhost"

  const testConnection = async () => {
    if (!endpoint) return

    setIsLoading(true)
    try {
      // LM Studio exposes an OpenAI-compatible API at /v1
      const response = await fetch(`${endpoint.replace(/\/+$/, "")}/v1/models`)
      if (response.ok) {
        toast({
          title: "LM Studio connection successful",
          description: "You can now use LM Studio models locally.",
        })
      } else {
        toast({
          title: "LM Studio connection failed",
          description: "Please check your LM Studio endpoint and try again.",
        })
      }
    } catch {
      toast({
        title: "LM Studio connection failed",
        description: "Make sure the LM Studio local server is running.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-lg font-medium">LM Studio</h3>
        <p className="text-muted-foreground text-sm">
          Configure your local LM Studio server (OpenAI-compatible API) for
          running models locally.
          {isLocked && (
            <span className="mt-1 block text-orange-600 dark:text-orange-400">
              LM Studio is disabled in production mode.
            </span>
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>LM Studio</span>
            <Switch
              checked={enabled && !isLocked}
              onCheckedChange={setEnabled}
              disabled={isLocked}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="lmstudio-endpoint">Endpoint</Label>
            <Input
              id="lmstudio-endpoint"
              type="url"
              placeholder="http://0.0.0.0:1234"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              disabled={!enabled || isLocked}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              {isLocked
                ? "Endpoint is read-only in production mode."
                : "Default LM Studio endpoint. Start the local server from the LM Studio app (Developer tab)."}
            </p>
          </div>

          {enabled && !isLocked && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={isLoading || !endpoint}
              >
                {isLoading ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          )}

          {isLocked && (
            <div className="rounded-md bg-orange-50 p-3 dark:bg-orange-950/20">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                LM Studio is disabled in production deployments for performance
                and security.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
