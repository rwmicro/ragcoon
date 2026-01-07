export type LayoutType = "sidebar" | "fullscreen"
export type NavigationPosition = "sidebar" | "header"

export type UserPreferences = {
  layout: LayoutType
  navigationPosition: NavigationPosition
  showConversationPreviews: boolean
  enableFileUploads: boolean
  enableSearchShortcut: boolean
  multiModelEnabled: boolean
  promptSuggestions: boolean
  showToolInvocations: boolean
}

export const defaultPreferences: UserPreferences = {
  layout: "sidebar",
  navigationPosition: "sidebar",
  showConversationPreviews: false,
  enableFileUploads: true,
  enableSearchShortcut: true,
  multiModelEnabled: false,
  promptSuggestions: true,
  showToolInvocations: true,
}