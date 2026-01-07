export function CommandFooter() {
  return (
    <div className="bg-card border-input right-0 bottom-0 left-0 flex items-center justify-between border-t px-4 py-3">
      <div className="text-muted-foreground flex w-full items-center justify-between gap-4 text-xs">
        <div className="flex flex-row items-center gap-4">
          <div className="flex flex-row items-center gap-1.5">
            <div className="flex flex-row items-center gap-0.5">
              <span className="border-border bg-muted inline-flex size-5 items-center justify-center rounded-sm border">
                ↑
              </span>
              <span className="border-border bg-muted inline-flex size-5 items-center justify-center rounded-sm border">
                ↓
              </span>
            </div>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="border-border bg-muted inline-flex size-5 items-center justify-center rounded-sm border">
              ⏎
            </span>
            <span>Go to chat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex flex-row items-center gap-0.5">
              <span className="border-border bg-muted inline-flex size-5 items-center justify-center rounded-sm border">
                ⌘
              </span>
              <span className="border-border bg-muted inline-flex size-5 items-center justify-center rounded-sm border">
                K
              </span>
            </div>
            <span>Toggle</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="border-border bg-muted inline-flex h-5 items-center justify-center rounded-sm border px-1">
            Esc
          </span>
          <span>Close</span>
        </div>
      </div>
    </div>
  )
}
