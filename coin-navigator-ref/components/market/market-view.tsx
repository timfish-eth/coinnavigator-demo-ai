"use client"

import { Panel, PanelHeader } from "@/components/app/panel"
import { TokenAvatar } from "@/components/primitives"
import { aiScore, assets, featuredAssets, getAsset, narratives } from "@/lib/data"
import { cn } from "@/lib/utils"
import { ArrowUpRight, Compass, Search, Sparkles } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

const categories = ["All", "AI", "Layer 1", "Layer 2", "RWA", "DePIN", "Oracle"] as const

// Short "why trending" reason per asset, sourced from the featured list.
const whyTrendingMap: Record<string, string> = Object.fromEntries(
  featuredAssets.map((f) => [f.id, f.whyTrending]),
)

export function MarketView() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<(typeof categories)[number]>("All")

  // Researched assets, ranked by AI Score. Falls back to the full asset list.
  const researched = useMemo(() => {
    const ordered = featuredAssets.map((f) => getAsset(f.id))
    const seen = new Set(ordered.map((a) => a.id))
    const rest = assets.filter((a) => !seen.has(a.id))
    return [...ordered, ...rest]
  }, [])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return researched.filter((a) => {
      const matchesQuery = !q || a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q)
      const matchesCat = category === "All" || a.category === category
      return matchesQuery && matchesCat
    })
  }, [researched, query, category])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Market</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Discover crypto narratives and assets worth researching.
        </p>
      </header>

      {/* Section 1 — Trending Narratives */}
      <Panel>
        <PanelHeader
          title="Trending Narratives"
          icon={Compass}
          action={<span className="text-xs text-muted-foreground">Market themes</span>}
        />
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-b-2xl bg-border sm:grid-cols-2">
          {narratives.map((n) => (
            <div key={n.name} className="flex flex-col bg-card p-5 transition-colors hover:bg-white/[0.02]">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">{n.name}</h3>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                  Score {n.activity}
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-primary" style={{ width: `${n.activity}%` }} />
              </div>
              <p className="mt-3 flex-1 text-xs leading-relaxed text-muted-foreground text-pretty">{n.note}</p>
              <div className="mt-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Related Tokens</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
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
            </div>
          ))}
        </div>
      </Panel>

      {/* Section 2 — Featured Assets */}
      <Panel>
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Featured Assets</h2>
            <span className="rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
              {rows.length}
            </span>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets..."
              className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-4">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                category === c
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Asset</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-center font-medium">AI Research Score</th>
                  <th className="px-4 py-3 font-medium">Why Trending</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr
                    key={a.id}
                    className="group border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5">
                      <Link href={`/token/${a.id}`} className="flex items-center gap-3">
                        <TokenAvatar id={a.id} symbol={a.symbol} color={a.color} size={32} />
                        <div>
                          <p className="font-medium leading-tight text-foreground group-hover:text-primary">{a.name}</p>
                          <p className="text-xs leading-tight text-muted-foreground">{a.symbol}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
                        {a.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center">
                        <span className="inline-flex min-w-9 items-center justify-center rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold tabular-nums text-primary">
                          {aiScore(a)}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[280px] px-4 py-3.5">
                      <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                        {whyTrendingMap[a.id] ?? a.event}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/token/${a.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        View Research <ArrowUpRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-surface ring-1 ring-border">
              <Search className="size-5 text-muted-foreground" />
            </span>
            <p className="mt-4 text-sm font-medium text-foreground">No assets match your search</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different category or search term.</p>
          </div>
        )}
      </Panel>
    </div>
  )
}
