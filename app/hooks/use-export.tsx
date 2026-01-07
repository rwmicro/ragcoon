import { useCallback } from "react"
import { toast } from "sonner"

export interface ExportMessage {
  role: "user" | "assistant"
  content: string
  timestamp?: number
}

export function useExport() {
  const exportAsMarkdown = useCallback((messages: ExportMessage[], title?: string) => {
    const header = title ? `# ${title}\n\n` : "# Conversation\n\n"
    const timestamp = `*Exported: ${new Date().toLocaleString()}*\n\n---\n\n`

    const content = messages.map(msg => {
      const role = msg.role === "user" ? "**You**" : "**Assistant**"
      const time = msg.timestamp
        ? ` (${new Date(msg.timestamp).toLocaleTimeString()})`
        : ""
      return `${role}${time}\n\n${msg.content}\n\n---\n\n`
    }).join("")

    const markdown = header + timestamp + content

    const blob = new Blob([markdown], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `conversation-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)

    toast.success("Exported as Markdown")
  }, [])

  const exportAsPDF = useCallback(async (messages: ExportMessage[], title?: string) => {
    // For PDF export, we'll create HTML and use print
    const header = title ? `<h1>${title}</h1>` : "<h1>Conversation</h1>"
    const timestamp = `<p><em>Exported: ${new Date().toLocaleString()}</em></p><hr/>`

    const content = messages.map(msg => {
      const role = msg.role === "user" ? "You" : "Assistant"
      const time = msg.timestamp
        ? ` (${new Date(msg.timestamp).toLocaleTimeString()})`
        : ""

      return `
        <div style="margin-bottom: 2em;">
          <p style="font-weight: bold; color: #666;">${role}${time}</p>
          <div style="margin-top: 0.5em; white-space: pre-wrap;">${msg.content}</div>
          <hr style="margin-top: 1.5em; border: none; border-top: 1px solid #ddd;"/>
        </div>
      `
    }).join("")

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title || "Conversation"}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 2em;
              line-height: 1.6;
            }
            h1 {
              border-bottom: 2px solid #333;
              padding-bottom: 0.5em;
            }
          </style>
        </head>
        <body>
          ${header}
          ${timestamp}
          ${content}
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
      }
      toast.success("Opening print dialog for PDF export")
    } else {
      toast.error("Please allow popups to export as PDF")
    }
  }, [])

  const exportAsJSON = useCallback((data: any, filename?: string) => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename || `export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast.success("Exported as JSON")
  }, [])

  const copyConversationLink = useCallback((chatId: string) => {
    const url = `${window.location.origin}/c/${chatId}`
    navigator.clipboard.writeText(url)
    toast.success("Link copied to clipboard")
  }, [])

  return {
    exportAsMarkdown,
    exportAsPDF,
    exportAsJSON,
    copyConversationLink,
  }
}
