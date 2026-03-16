import { getMessagesFromDb } from "./chat-store/messages/api"
import { Chat } from "./chat-store/types"

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function exportChatAsMarkdown(chat: Chat) {
    const messages = await getMessagesFromDb(chat.id)
    const content = messages.map(m => {
        const role = m.role === 'user' ? 'User' : 'Assistant'
        return `### ${role}\n\n${m.content}\n`
    }).join('\n---\n\n')

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chat.title || 'chat'}.md`
    a.click()
    URL.revokeObjectURL(url)
}

export async function exportChatAsJSON(chat: Chat) {
    const messages = await getMessagesFromDb(chat.id)
    const payload = {
        id: chat.id,
        title: chat.title,
        model: chat.model,
        created_at: chat.created_at,
        messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
        })),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chat.title || 'chat'}.json`
    a.click()
    URL.revokeObjectURL(url)
}

export async function exportChatAsPDF(chat: Chat) {
    // For PDF, we'll open a new window with a print-friendly view
    const messages = await getMessagesFromDb(chat.id)

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
        alert('Please allow popups to export as PDF')
        return
    }

    const htmlContent = `
        <html>
        <head>
            <title>${chat.title || 'Chat Export'}</title>
            <style>
                body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
                .message { margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #eee; }
                .role { font-weight: bold; margin-bottom: 0.5rem; color: #666; text-transform: capitalize; }
                .content { white-space: pre-wrap; }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>${chat.title || 'Chat Export'}</h1>
            ${messages.map(m => `
                <div class="message">
                    <div class="role">${escapeHtml(m.role)}</div>
                    <div class="content">${escapeHtml(m.content)}</div>
                </div>
            `).join('')}
            <script>
                window.onload = () => {
                    window.print();
                }
            </script>
        </body>
        </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
}
