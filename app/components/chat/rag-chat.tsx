"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { CircleNotch } from "@phosphor-icons/react"

interface Source {
  chunk: {
    id: string
    content: string
    metadata: {
      filename: string
      title?: string
      chunkIndex: number
      pageNumber?: number
      fileType: string
    }
  }
  score: number
  distance: number
}

interface Message {
  role: "user" | "assistant"
  content: string
  sources?: Source[]
}

export function RAGChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showSources, setShowSources] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/rag/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: userMessage.content,
          model: "llama3.1:latest",
          topK: 5,
          temperature: 0.7,
          stream: false,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer,
        sources: data.sources,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error:", error)

      const errorMessage: Message = {
        role: "assistant",
        content: "Désolé, une erreur s'est produite lors de la génération de la réponse.",
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-muted-foreground flex h-full items-center justify-center text-center">
            <div>
              <p className="mb-2 text-lg font-medium">
                Chat RAG avec vos documents
              </p>
              <p className="text-sm">
                Posez une question sur vos documents indexés
              </p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className="space-y-2">
            <Card
              className={`p-4 ${
                message.role === "user"
                  ? "bg-primary/10 ml-12"
                  : "bg-muted mr-12"
              }`}
            >
              <div className="mb-1 text-sm font-semibold">
                {message.role === "user" ? "Vous" : "Assistant RAG"}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>

              {/* Sources */}
              {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <button
                    onClick={() =>
                      setShowSources(showSources === index ? null : index)
                    }
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    {showSources === index ? "Masquer" : "Voir"} les sources (
                    {message.sources.length})
                  </button>

                  {showSources === index && (
                    <div className="mt-2 space-y-2">
                      {message.sources.map((source, idx) => (
                        <Card key={idx} className="bg-background p-3 text-sm">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-medium">
                              📄 {source.chunk.metadata.filename}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              Score: {(source.score * 100).toFixed(1)}%
                            </span>
                          </div>

                          {source.chunk.metadata.title && (
                            <div className="text-muted-foreground mb-1 text-xs">
                              {source.chunk.metadata.title}
                            </div>
                          )}

                          {source.chunk.metadata.pageNumber && (
                            <div className="text-muted-foreground mb-1 text-xs">
                              Page {source.chunk.metadata.pageNumber}
                            </div>
                          )}

                          <div className="text-muted-foreground mt-2 line-clamp-3 text-xs">
                            {source.chunk.content}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        ))}

        {isLoading && (
          <Card className="bg-muted mr-12 p-4">
            <div className="flex items-center gap-2">
              <CircleNotch className="animate-spin" size={20} />
              <span>Recherche dans les documents et génération...</span>
            </div>
          </Card>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez une question sur vos documents..."
            className="min-h-[60px] flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button type="submit" disabled={!input.trim() || isLoading}>
            Envoyer
          </Button>
        </div>
        <div className="text-muted-foreground mt-2 text-xs">
          Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne
        </div>
      </form>
    </div>
  )
}
