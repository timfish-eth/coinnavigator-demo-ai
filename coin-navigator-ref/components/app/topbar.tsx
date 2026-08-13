"use client"

import { CommandPalette } from "@/components/app/command-palette"
import { UserMenu } from "@/components/auth/user-menu"
import { Search } from "lucide-react"
import { useEffect, useState } from "react"

export function Topbar({ placeholder = "Search assets, projects, narratives, reports..." }: { placeholder?: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      <div className="relative flex-1 max-w-xl">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open search"
          className="flex h-10 w-full items-center gap-3 rounded-lg border border-border bg-surface pl-9 pr-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <span className="truncate">{placeholder}</span>
          <kbd className="ml-auto hidden shrink-0 items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex">
            ⌘K
          </kbd>
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <UserMenu />
      </div>

      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </header>
  )
}
