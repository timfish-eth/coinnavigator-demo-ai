"use client"

import { nextBeijingRefreshAt } from "@/lib/beijing-day"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function RefreshOnBeijingMidnight() {
  const router = useRouter()

  useEffect(() => {
    const delay = Math.max(1_000, nextBeijingRefreshAt().getTime() - Date.now() + 1_000)
    const timeout = window.setTimeout(() => router.refresh(), delay)
    return () => window.clearTimeout(timeout)
  }, [router])

  return null
}
