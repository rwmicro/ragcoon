export type LayoutType = "sidebar" | "fullscreen"

export type UserPreferences = {
  layout: LayoutType
  showConversationPreviews: boolean
  enableFileUploads: boolean
  enableSearchShortcut: boolean
  multiModelEnabled: boolean
  promptSuggestions: boolean
  showToolInvocations: boolean
}

export const defaultPreferences: UserPreferences = {
  layout: "sidebar",
  showConversationPreviews: true,
  enableFileUploads: true,
  enableSearchShortcut: true,
  multiModelEnabled: false,
  promptSuggestions: true,
  showToolInvocations: true,
}