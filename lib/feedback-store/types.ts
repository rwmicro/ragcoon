export type FeedbackType = "positive" | "negative" | "neutral"

export interface MessageFeedback {
  messageId: string
  chatId: string
  type: FeedbackType
  timestamp: number
  comment?: string
  // RAG-specific feedback
  sourcesRelevant?: boolean
  responseAccurate?: boolean
  responseHelpful?: boolean
}

export interface FeedbackStore {
  feedbacks: Record<string, MessageFeedback> // messageId -> feedback
}

export const DEFAULT_FEEDBACK_STORE: FeedbackStore = {
  feedbacks: {},
}
