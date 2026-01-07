import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { FeedbackStore, MessageFeedback, FeedbackType } from "./types"
import { DEFAULT_FEEDBACK_STORE } from "./types"

interface FeedbackStoreActions {
  getFeedback: (messageId: string) => MessageFeedback | undefined
  addFeedback: (feedback: MessageFeedback) => void
  updateFeedback: (messageId: string, updates: Partial<MessageFeedback>) => void
  removeFeedback: (messageId: string) => void
  getAllFeedbacks: () => MessageFeedback[]
  clearAllFeedbacks: () => void
}

export const useFeedbackStore = create<FeedbackStore & FeedbackStoreActions>()(
  persist(
    (set, get) => ({
      ...DEFAULT_FEEDBACK_STORE,

      getFeedback: (messageId) => {
        return get().feedbacks[messageId]
      },

      addFeedback: (feedback) => {
        set((state) => ({
          feedbacks: {
            ...state.feedbacks,
            [feedback.messageId]: feedback,
          },
        }))
      },

      updateFeedback: (messageId, updates) => {
        set((state) => {
          const existing = state.feedbacks[messageId]
          if (!existing) return state

          return {
            feedbacks: {
              ...state.feedbacks,
              [messageId]: {
                ...existing,
                ...updates,
              },
            },
          }
        })
      },

      removeFeedback: (messageId) => {
        set((state) => {
          const { [messageId]: removed, ...rest } = state.feedbacks
          return { feedbacks: rest }
        })
      },

      getAllFeedbacks: () => {
        return Object.values(get().feedbacks)
      },

      clearAllFeedbacks: () => {
        set({ feedbacks: {} })
      },
    }),
    {
      name: "message-feedback-storage",
      version: 1,
    }
  )
)
