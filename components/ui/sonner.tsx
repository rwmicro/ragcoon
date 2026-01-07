"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group !z-[999999]"
      position="top-right"
      expand={true}
      richColors={true}
      closeButton={true}
      toastOptions={{
        className: "!z-[999999]",
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: "group-[.toast]:bg-background group-[.toast]:text-foreground group-[.toast]:border-border",
          success: "group-[.toast]:bg-green-50 dark:group-[.toast]:bg-green-950 group-[.toast]:text-green-900 dark:group-[.toast]:text-green-100 group-[.toast]:border-green-200 dark:group-[.toast]:border-green-800",
          error: "group-[.toast]:bg-red-50 dark:group-[.toast]:bg-red-950 group-[.toast]:text-red-900 dark:group-[.toast]:text-red-100 group-[.toast]:border-red-200 dark:group-[.toast]:border-red-800",
          warning: "group-[.toast]:bg-yellow-50 dark:group-[.toast]:bg-yellow-950 group-[.toast]:text-yellow-900 dark:group-[.toast]:text-yellow-100 group-[.toast]:border-yellow-200 dark:group-[.toast]:border-yellow-800",
          info: "group-[.toast]:bg-blue-50 dark:group-[.toast]:bg-blue-950 group-[.toast]:text-blue-900 dark:group-[.toast]:text-blue-100 group-[.toast]:border-blue-200 dark:group-[.toast]:border-blue-800",
        },
      }}
      style={
        {
          "--normal-bg": "hsl(var(--background))",
          "--normal-text": "hsl(var(--foreground))",
          "--normal-border": "hsl(var(--border))",
          "--success-bg": "hsl(142.1 76.2% 36.3%)",
          "--success-text": "hsl(0 0% 100%)",
          "--error-bg": "hsl(0 84.2% 60.2%)",
          "--error-text": "hsl(0 0% 100%)",
          "--warning-bg": "hsl(47.9 95.8% 53.1%)",
          "--warning-text": "hsl(26 83.3% 14.1%)",
          "--info-bg": "hsl(221.2 83.2% 53.3%)",
          "--info-text": "hsl(0 0% 100%)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
