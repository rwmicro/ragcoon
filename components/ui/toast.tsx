"use client"

import { CheckCircle, Info, Warning, X } from "@phosphor-icons/react"
import { toast as sonnerToast } from "sonner"
import { Button } from "./button"
import { cn } from "@/lib/utils"

type ToastProps = {
  id: string | number
  title: string
  description?: string
  button?: {
    label: string
    onClick: () => void
  }
  status?: "error" | "info" | "success" | "warning"
}

function Toast({ title, description, button, id, status }: ToastProps) {
  return (
    <div className={cn(
      "relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all",
      "bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60",
      "animate-in slide-in-from-top-2 fade-in duration-300",
      status === "error" && "border-red-500/20 bg-red-500/5",
      status === "success" && "border-green-500/20 bg-green-500/5",
      status === "warning" && "border-yellow-500/20 bg-yellow-500/5",
      status === "info" && "border-blue-500/20 bg-blue-500/5",
      !status && "border-border/50"
    )}>
      <div className="shrink-0 pt-0.5">
        {status === "error" && <Warning className="size-5 text-red-500" weight="duotone" />}
        {status === "info" && <Info className="size-5 text-blue-500" weight="duotone" />}
        {status === "success" && <CheckCircle className="size-5 text-green-500" weight="duotone" />}
        {status === "warning" && <Warning className="size-5 text-yellow-500" weight="duotone" />}
        {!status && <Info className="size-5 text-foreground" weight="duotone" />}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium leading-none tracking-tight text-foreground">
          {title}
        </h3>
        {description && (
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
        {button && (
          <div className="mt-3">
            <Button
              size="sm"
              onClick={() => {
                button?.onClick()
                sonnerToast.dismiss(id)
              }}
              type="button"
              variant="secondary"
              className="h-7 text-xs px-3"
            >
              {button?.label}
            </Button>
          </div>
        )}
      </div>

      <button
        onClick={() => sonnerToast.dismiss(id)}
        className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:group-[.toast]:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function toast(toast: Omit<ToastProps, "id">) {
  return sonnerToast.custom(
    (id) => (
      <Toast
        id={id}
        title={toast.title}
        description={toast?.description}
        button={toast?.button}
        status={toast?.status}
      />
    ),
    {
      position: "top-center",
      duration: 4000,
    }
  )
}

// Add static methods to match sonner API for convenience
toast.success = (message: string, options?: any) => toast({ title: message, status: "success", ...options })
toast.error = (message: string, options?: any) => toast({ title: message, status: "error", ...options })
toast.info = (message: string, options?: any) => toast({ title: message, status: "info", ...options })
toast.warning = (message: string, options?: any) => toast({ title: message, status: "warning", ...options })

export { toast }
