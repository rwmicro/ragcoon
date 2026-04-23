import { ChatContainer } from "@/app/components/chat/chat-container"
import { ChatErrorBoundary } from "@/app/components/chat/chat-error-boundary"
import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"

export const dynamic = "force-dynamic"

export default function Home() {
  return (
    <MessagesProvider>
      <LayoutApp>
        <ChatErrorBoundary>
          <ChatContainer />
        </ChatErrorBoundary>
      </LayoutApp>
    </MessagesProvider>
  )
}
