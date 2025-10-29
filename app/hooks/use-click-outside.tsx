import { RefObject, useEffect, useRef } from "react"

function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  const handlerRef = useRef(handler)

  // Keep handler ref up to date
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!ref || !ref.current || ref.current.contains(event.target as Node)) {
        return
      }

      handlerRef.current(event)
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [ref]) // Only re-register when ref changes
}

export default useClickOutside
