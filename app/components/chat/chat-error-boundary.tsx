"use client"

import { Button } from "@/components/ui/button"
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react"
import React from "react"

type Props = {
  children: React.ReactNode
}

type State = {
  error: Error | null
}

export class ChatErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ChatErrorBoundary] Uncaught error:", error, info)
  }

  reset = () => {
    this.setState({ error: null })
  }

  reload = () => {
    if (typeof window !== "undefined") window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex max-w-md flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <WarningCircle className="size-10 text-destructive" weight="duotone" />
          <div>
            <p className="text-sm font-medium">Something went wrong in the chat.</p>
            <p className="mt-1 text-xs text-muted-foreground break-words">
              {this.state.error.message || "Unknown error"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={this.reset}>
              Try again
            </Button>
            <Button size="sm" onClick={this.reload}>
              <ArrowClockwise className="size-3.5" />
              Reload
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
