"use client"

import { Panel, PanelHeader } from "@/components/app/panel"
import { ChangeBadge, TokenAvatar } from "@/components/primitives"
import type { ComputedFeaturedAsset } from "@/lib/ai-analysis"
import { aiScore, assets as fallbackAssets, featuredAssets, narratives as fallbackNarratives, type Asset, type Narrative } from "@/lib/data"
import { useWatchlist } from "@/lib/use-watchlist"
import { cn } from "@/lib/utils"
import { ArrowUpRight, Compass, Loader2, Search, Sparkles, Star } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type MarketResponse = {
  assets: Asset[]
  source: "CoinMarketCap" | "CoinGecko" | "Demo"
  updatedAt: string
}

type SearchMarketResponse = MarketResponse & {
  query: string
}

const MARKET_REFRESH_MS = 5 * 60 * 1000

// Short "why trending" reason per asset, sourced from the featured list.
const whyTrendingMap: Record<string, string> = Object.fromEntries(
  featuredAssets.map((f) => [f.id, f.whyTrending]),
)

function researchScoreFor(asset: Asset, scoredAssets: Map<string, ComputedFeaturedAsset>): number {
  return scoredAssets.get(asset.id)?.score ?? aiScore(asset)
}

export function MarketView() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")
  const [market, setMarket] = useState<MarketResponse>({
    assets: fallbackAssets,
    source: "Demo",
    updatedAt: new Date().toISOString(),
  })
  const [featuredAnalysis, setFeaturedAnalysis] = useState<ComputedFeaturedAsset[]>([])
  const [dynamicNarratives, setDynamicNarratives] = useState<Narrative[]>(fallbackNarratives)
  const [loading, setLoading] = useState(true)
  const [searchMarket, setSearchMarket] = useState<SearchMarketResponse | undefined>()
  const { isSaved, toggleAsset } = useWatchlist()
  const trimmedQuery = query.trim()

  useEffect(() => {
    let cancelled = false
    async function loadMarket(showLoading = false) {
      if (showLoading) setLoading(true)
      try {
        const response = await fetch("/api/market/top100")
        if (!response.ok) throw new Error(`Market API responded ${response.status}`)
        const data = await response.json() as MarketResponse
        if (!cancelled) setMarket(data)
      } catch {
        if (!cancelled) {
          setMarket({
            assets: fallbackAssets,
            source: "Demo",
            updatedAt: new Date().toISOString(),
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadMarket(true)
    const interval = window.setInterval(() => {
      void loadMarket()
    }, MARKET_REFRESH_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadAnalysis() {
      try {
        const response = await fetch("/api/research/market-analysis")
        if (!response.ok) throw new Error(`Analysis API responded ${response.status}`)
        const data = await response.json() as { featuredAssets: ComputedFeaturedAsset[]; narratives: Narrative[] }
        if (!cancelled) {
          setFeaturedAnalysis(data.featuredAssets)
          setDynamicNarratives(data.narratives.length ? data.narratives : fallbackNarratives)
        }
      } catch {
        if (!cancelled) {
          setFeaturedAnalysis([])
          setDynamicNarratives(fallbackNarratives)
        }
      }
    }

    void loadAnalysis()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const q = trimmedQuery
    if (!q) return

    let cancelled = false
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`)
        if (!response.ok) throw new Error(`Search API responded ${response.status}`)
        const data = await response.json() as MarketResponse
        if (!cancelled) setSearchMarket({ ...data, query: q })
      } catch {
        if (!cancelled) {
          setSearchMarket({
            assets: [],
            source: "Demo",
            updatedAt: new Date().toISOString(),
            query: q,
          })
        }
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [trimmedQuery])

  const pendingSearchMarket = useMemo<MarketResponse>(() => ({
    assets: [],
    source: searchMarket?.source ?? market.source,
    updatedAt: market.updatedAt,
  }), [market.source, market.updatedAt, searchMarket?.source])
  const searchLoading = Boolean(trimmedQuery && searchMarket?.query !== trimmedQuery)
  const activeMarket = trimmedQuery ? (searchMarket?.query === trimmedQuery ? searchMarket : pendingSearchMarket) : market
  const activeAssets = useMemo(() => activeMarket.assets, [activeMarket])
  const activeUpdatedAt = activeMarket?.updatedAt ?? market.updatedAt

  const categories = useMemo(() => {
    const values = Array.from(new Set(activeAssets.map((asset) => asset.category))).sort()
    return ["All", ...values]
  }, [activeAssets])

  const rows = useMemo(() => {
    return activeAssets.filter((a) => {
      const matchesCat = category === "All" || a.category === category
      return matchesCat
    })
  }, [activeAssets, category])

  const updatedLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(activeUpdatedAt))
  }, [activeUpdatedAt])

  const featuredById = useMemo(() => {
    return new Map(featuredAnalysis.map((item) => [item.id, item]))
  }, [featuredAnalysis])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Market</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Discover top 100 crypto assets by market capitalization.
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
          {dynamicNarratives.map((n) => (
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
            <h2 className="text-sm font-semibold text-foreground">
              {trimmedQuery ? "Search Results" : "Top 100 Assets"}
            </h2>
            <span className="rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
              {searchLoading ? "Searching" : rows.length}
            </span>
            <span className="rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
              {loading || searchLoading ? "Loading market data" : `${activeMarket?.source ?? market.source} / ${updatedLabel}`}
            </span>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setCategory("All")
              }}
              placeholder="Search name or symbol..."
              className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
            />
            {searchLoading && (
              <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
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

        {searchLoading && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-surface ring-1 ring-border">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </span>
            <p className="mt-4 text-sm font-medium text-foreground">Searching token index</p>
            <p className="mt-1 text-sm text-muted-foreground">Looking up CoinGecko assets by name or symbol.</p>
          </div>
        ) : rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="w-12 px-4 py-3 text-center font-medium">#</th>
                  <th className="w-12 px-2 py-3 text-center font-medium" aria-label="Watchlist" />
                  <th className="px-4 py-3 font-medium">Asset</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-right font-medium">24h</th>
                  <th className="px-4 py-3 text-right font-medium">Market Cap</th>
                  <th className="px-4 py-3 text-right font-medium">Volume</th>
                  <th className="px-4 py-3 text-center font-medium">AI Research Score</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a, index) => {
                  const saved = isSaved(a.id)
                  return (
                  <tr
                    key={a.id}
                    className="group border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3.5 text-center text-xs tabular-nums text-muted-foreground">
                      {a.rank || index + 1}
                    </td>
                    <td className="px-2 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleAsset(a)}
                        aria-label={saved ? `Remove ${a.name} from watchlist` : `Add ${a.name} to watchlist`}
                        aria-pressed={saved}
                        className={cn(
                          "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-warning",
                          saved && "text-warning",
                        )}
                      >
                        <Star className={cn("size-4", saved && "fill-current")} />
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/token/${a.id}`} className="flex items-center gap-3">
                        <TokenAvatar id={a.id} symbol={a.symbol} color={a.color} imageUrl={a.imageUrl} size={32} />
                        <div>
                          <p className="font-medium leading-tight text-foreground group-hover:text-primary">{a.name}</p>
                          <p className="text-xs leading-tight text-muted-foreground">
                            {a.symbol} / {a.category}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium tabular-nums text-foreground">
                    ${a.price.toLocaleString("en-US", { maximumFractionDigits: a.price >= 1 ? 2 : 6 })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <ChangeBadge value={a.change24h} className="justify-end" />
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-foreground">{a.marketCap}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">{a.volume}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center">
                        <span className="inline-flex min-w-9 items-center justify-center rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold tabular-nums text-primary">
                          {researchScoreFor(a, featuredById)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/token/${a.id}`}
                        title={featuredById.get(a.id)?.whyTrending ?? whyTrendingMap[a.id] ?? a.event}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        View Research <ArrowUpRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-surface ring-1 ring-border">
              <Search className="size-5 text-muted-foreground" />
            </span>
            <p className="mt-4 text-sm font-medium text-foreground">No assets match your search</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different token name or symbol.</p>
          </div>
        )}
      </Panel>
    </div>
  )
}
