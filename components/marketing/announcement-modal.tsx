"use client"

import { X } from "lucide-react"
import { useEffect, useState } from "react"

const announcement =
  "The CoinNavigator platform is committed to complying with all relevant laws and regulations in various countries and regions. Due to the specific regulations on encrypted assets in certain countries, such as Afghanistan, Northern Mariana Islands, Puerto Rico, Guam, Syria, Mainland China, Democratic Republic of Congo, Cuba, Iran, Iraq, Japan, North Korea, Sudan, United States of America, and Zimbabwe, the platform is currently unable to provide services to users in these countries. We apologize for any inconvenience caused."

export function AnnouncementModal() {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0">
      <button
        type="button"
        aria-label="Close announcement"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Announcement</p>
            <h2 id="announcement-title" className="mt-1 text-lg font-semibold text-foreground">
              Service Availability Notice
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">{announcement}</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-5 flex h-10 w-full items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  )
}
