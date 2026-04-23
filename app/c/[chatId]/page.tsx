import { ChatContainer } from "@/app/components/chat/chat-container"
import { ChatErrorBoundary } from "@/app/components/chat/chat-error-boundary"
import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"

export default async function Page() {
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
