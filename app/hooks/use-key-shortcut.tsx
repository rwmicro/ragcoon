import { useEffect, useRef } from "react"

export function useKeyShortcut(
  keyCombo: (e: KeyboardEvent) => boolean,
  action: () => void
) {
  const actionRef = useRef(action)
  const keyComboRef = useRef(keyCombo)

  // Keep refs up to date
  useEffect(() => {
    actionRef.current = action
    keyComboRef.current = keyCombo
  }, [action, keyCombo])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (keyComboRef.current(e)) {
        e.preventDefault()
        actionRef.current()
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, []) // Empty deps - listener never recreated
}
