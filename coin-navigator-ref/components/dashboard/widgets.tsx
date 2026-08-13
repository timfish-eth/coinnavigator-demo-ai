"use client"

import Link from "next/link"
import { Panel, PanelHeader } from "@/components/app/panel"
import { TokenAvatar } from "@/components/primitives"
import { getAsset, keyInsights, marketBrief, marketMood, narratives, researchUpdates, type Impact } from "@/lib/data"
import { cn } from "@/lib/utils"
import { ArrowRight, ArrowUpRight, Compass, FileText, Lightbulb, Sparkles } from "lucide-react"

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function ImpactBadge({ impact }: { impact: Impact }) {
  const styles: Record<Impact, string> = {
    High: "bg-destructive/10 text-destructive ring-destructive/20",
    Medium: "bg-warning/10 text-warning ring-warning/20",
    Low: "bg-muted-foreground/10 text-muted-foreground ring-muted-foreground/20",
  }
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1", styles[impact])}>
      {impact} impact
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Section 1 — Today's Crypto Brief                                    */
/* ------------------------------------------------------------------ */

export function DailyBrief() {
  const moodTone =
    marketMood.condition === "Stable" ? "text-success" : "text-foreground"
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="size-4.5 text-primary" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Today&apos;s Crypto Brief</h2>
            <p className="text-xs text-muted-foreground">AI-generated summary of today&apos;s crypto market.</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{marketBrief.updated}</span>
      </div>

      <div className="grid gap-0 lg:grid-cols-3">
        {/* Market summary */}
        <div className="border-b border-border p-5 lg:col-span-2 lg:border-b-0 lg:border-r">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Market Summary</p>
          <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">{marketBrief.overview}</p>
          <Link
            href="/research"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <FileText className="size-3.5" /> Generate Research Report
          </Link>
        </div>

        {/* Market mood */}
        <div className="flex flex-col gap-4 bg-surface/40 p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Market Mood</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Market Condition</span>
            <span className={cn("text-sm font-semibold", moodTone)}>{marketMood.condition}</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Confidence</span>
              <span className="text-sm font-semibold text-foreground">{marketMood.confidence}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-primary" style={{ width: `${marketMood.confidence}%` }} />
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Section 2 — Key Insights Today                                      */
/* ------------------------------------------------------------------ */

export function KeyInsights() {
  return (
    <Panel>
      <PanelHeader
        title="Key Insights Today"
        icon={Lightbulb}
        action={<span className="text-xs text-muted-foreground">{keyInsights.length} signals</span>}
      />
      <div className="grid gap-px bg-border/60 sm:grid-cols-2">
        {keyInsights.map((insight) => (
          <div key={insight.id} className="group bg-card p-4 transition-colors hover:bg-white/[0.02]">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/20">
                {insight.category}
              </span>
              <ImpactBadge impact={insight.impact} />
            </div>
            <h3 className="mt-2.5 text-sm font-semibold leading-snug text-foreground">{insight.headline}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{insight.explanation}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Related:</span>
              {insight.relatedTokens.map((s) => (
                <span
                  key={s}
                  className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-medium text-foreground ring-1 ring-border"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Section 3 — Trending Narratives                                     */
/* ------------------------------------------------------------------ */

export function TrendingNarratives() {
  const shown = narratives.slice(0, 4)
  return (
    <Panel>
      <PanelHeader
        title="Trending Narratives"
        icon={Compass}
        action={
          <Link href="/market" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Explore market <ArrowUpRight className="size-3" />
          </Link>
        }
      />
      <div className="grid gap-px bg-border/60 sm:grid-cols-2">
        {shown.map((n) => (
          <div key={n.name} className="flex flex-col bg-card p-5 transition-colors hover:bg-white/[0.02]">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">{n.name}</h3>
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                Score {n.activity}
              </span>
            </div>
            <p className="mt-2.5 flex-1 text-xs leading-relaxed text-muted-foreground text-pretty">{n.note}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {n.assets.map((s) => (
                <span
                  key={s}
                  className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium text-foreground ring-1 ring-border"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */
/* Section 4 — Latest Research Updates                                 */
/* ------------------------------------------------------------------ */

export function LatestResearchUpdates() {
  return (
    <Panel>
      <PanelHeader
        title="Latest Research Updates"
        icon={Sparkles}
        action={
          <Link href="/research" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            All reports <ArrowUpRight className="size-3" />
          </Link>
        }
      />
      <div className="divide-y divide-border/60">
        {researchUpdates.map((u) => {
          const a = getAsset(u.id)
          return (
            <div key={u.id} className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02]">
              <TokenAvatar id={a.id} symbol={a.symbol} color={a.color} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{u.title}</p>
                  <span className="text-xs text-muted-foreground">{u.time}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{u.summary}</p>
              </div>
              <Link
                href={`/token/${a.id}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40"
              >
                View Research <ArrowRight className="size-3" />
              </Link>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
