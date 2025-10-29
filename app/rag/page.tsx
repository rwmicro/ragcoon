import { RAGChat } from "@/app/components/chat/rag-chat"
import { Card } from "@/components/ui/card"

export default function RAGPage() {
  return (
    <div className="container mx-auto max-w-4xl p-4">
      <div className="mb-4">
        <h1 className="mb-2 text-3xl font-bold">RAG Chat</h1>
        <p className="text-muted-foreground">
          Interrogez vos documents indexés avec l'intelligence artificielle
        </p>
      </div>

      <Card className="overflow-hidden">
        <RAGChat />
      </Card>
    </div>
  )
}
