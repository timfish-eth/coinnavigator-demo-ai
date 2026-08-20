import { AppShell } from "@/components/app/app-shell"
import {
  DailyBrief,
  KeyInsights,
  LatestResearchUpdates,
  TrendingNarratives,
} from "@/components/dashboard/widgets"
import { RefreshOnBeijingMidnight } from "@/components/dashboard/refresh-on-beijing-midnight"
import { formatBeijingRefreshTime } from "@/lib/beijing-day"

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  })
  return (
    <AppShell>
      <RefreshOnBeijingMidnight />
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">AI-powered crypto research and daily insights.</p>
          </div>
          <p className="text-xs text-muted-foreground">{today} · Next refresh: {formatBeijingRefreshTime()}</p>
        </div>

        {/* Section 1 — Today's Crypto Brief */}
        <DailyBrief />

        {/* Section 2 — Key Insights Today */}
        <KeyInsights />

        {/* Section 3 — Trending Narratives */}
        <TrendingNarratives />

        {/* Section 4 — Latest Research Updates */}
        <LatestResearchUpdates />
      </div>
    </AppShell>
  )
}
