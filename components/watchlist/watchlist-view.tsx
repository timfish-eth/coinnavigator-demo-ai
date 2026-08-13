"use client"

import { EmptyState } from "@/components/app/empty-state"
import { Panel, PanelHeader } from "@/components/app/panel"
import { useAuth } from "@/components/auth/auth-context"
import { AISignalPill, TokenAvatar } from "@/components/primitives"
import { buttonVariants } from "@/components/ui/button"
import { aiSignal, assetNarrative, type AISignal, type Asset } from "@/lib/data"
import { useWatchlist } from "@/lib/use-watchlist"
import { cn } from "@/lib/utils"
import { ArrowUpRight, Bookmark, Compass, Loader2, Plus, Radar, Search, Trash2, TrendingDown, TrendingUp, X, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

type ChangeType = "Signal Change" | "Narrative Shift" | "New Insight" | "Risk Flag"
type DetectedChange = {
  id: string
  symbol: string
  color: string
  assetName: string
  type: ChangeType
  signal: AISignal
  text: string
  time: string
}

type WatchlistSnapshot = {
  price: number
  change24h: number
  activity: number
  signal: Asset["signal"]
  event: string
  updatedAt: string
}

const SNAPSHOT_KEY = "coinnavigator.watchlist.snapshots"

function readSnapshots(): Record<string, WatchlistSnapshot> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY)
    return raw ? JSON.parse(raw) as Record<string, WatchlistSnapshot> : {}
  } catch {
    return {}
  }
}

function writeSnapshots(assets: Asset[]) {
  if (typeof window === "undefined") return
  const current = readSnapshots()
  const updatedAt = new Date().toISOString()
  const next = { ...current }
  for (const asset of assets) {
    next[asset.id] = {
      price: asset.price,
      change24h: asset.change24h,
      activity: asset.activity,
      signal: asset.signal,
      event: asset.event,
      updatedAt,
    }
  }
  window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next))
}

function relativeTime(input?: string): string {
  if (!input) return "Just now"
  const diffMs = Date.now() - new Date(input).getTime()
  const minutes = Math.max(0, Math.round(diffMs / 60_000))
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function detectChanges(tracked: Asset[], previous: Record<string, WatchlistSnapshot>): DetectedChange[] {
  return tracked.map((asset) => {
    const prev = previous[asset.id]
    const signal = aiSignal(asset)
    let type: ChangeType = "New Insight"
    let text = asset.event

    if (prev?.signal && prev.signal !== asset.signal) {
      type = "Signal Change"
      text = `AI signal changed from ${prev.signal} to ${asset.signal}. ${asset.event}`
    } else if (prev && Math.abs(asset.change24h - prev.change24h) >= 3) {
      type = asset.change24h > prev.change24h ? "Narrative Shift" : "Risk Flag"
      text = `24h momentum moved from ${prev.change24h.toFixed(2)}% to ${asset.change24h.toFixed(2)}%.`
    } else if (prev && Math.abs(asset.activity - prev.activity) >= 8) {
      type = "Narrative Shift"
      text = `Activity score changed from ${prev.activity} to ${asset.activity}. ${asset.event}`
    } else if (asset.signal === "Bullish") {
      type = asset.activity >= 80 ? "Signal Change" : "Narrative Shift"
      text = `AI signal strengthened to Positive. ${asset.event}`
    } else if (asset.signal === "Bearish") {
      type = "Risk Flag"
      text = `Flagged for review. ${asset.event}`
    }

    return {
      id: asset.id,
      symbol: asset.symbol,
      color: asset.color,
      assetName: asset.name,
      type,
      signal,
      text,
      time: relativeTime(prev?.updatedAt),
    }
  })
}

const changeMeta: Record<ChangeType, { icon: typeof Zap; cls: string }> = {
  "Signal Change": { icon: TrendingUp, cls: "bg-success/10 text-success ring-success/20" },
  "Narrative Shift": { icon: Radar, cls: "bg-primary/10 text-primary ring-primary/20" },
  "New Insight": { icon: Zap, cls: "bg-muted-foreground/10 text-muted-foreground ring-muted-foreground/20" },
  "Risk Flag": { icon: TrendingDown, cls: "bg-warning/10 text-warning ring-warning/20" },
}

export function WatchlistView() {
  const { requireWallet } = useAuth()
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const { assets: tracked, ready, addAsset, removeAsset } = useWatchlist()
  const [liveTracked, setLiveTracked] = useState<Asset[]>(tracked)
  const [previousSnapshots, setPreviousSnapshots] = useState<Record<string, WatchlistSnapshot>>({})
  const [refreshing, setRefreshing] = useState(false)
  const trackedIds = useMemo(() => new Set(tracked.map((asset) => asset.id)), [tracked])
  const visibleTracked = useMemo(() => {
    const filtered = liveTracked.filter((asset) => trackedIds.has(asset.id))
    return filtered.length === tracked.length ? filtered : tracked
  }, [liveTracked, tracked, trackedIds])

  useEffect(() => {
    if (!tracked.length) return

    let cancelled = false
    async function refreshTrackedAssets() {
      setRefreshing(true)
      try {
        const snapshots = readSnapshots()
        const refreshed = await Promise.all(
          tracked.map(async (asset) => {
            const response = await fetch(`/api/market/search?q=${encodeURIComponent(asset.symbol || asset.id)}`)
            if (!response.ok) return asset
            const data = await response.json() as { assets: Asset[] }
            return data.assets.find((item) => item.id === asset.id || item.symbol === asset.symbol) ?? data.assets[0] ?? asset
          }),
        )
        if (!cancelled) {
          setPreviousSnapshots(snapshots)
          setLiveTracked(refreshed)
          writeSnapshots(refreshed)
        }
      } catch {
        if (!cancelled) setLiveTracked(tracked)
      } finally {
        if (!cancelled) setRefreshing(false)
      }
    }

    void refreshTrackedAssets()
    return () => {
      cancelled = true
    }
  }, [tracked])

  const changes = useMemo(() => detectChanges(visibleTracked, previousSnapshots), [visibleTracked, previousSnapshots])
  const openReport = (id: string) => requireWallet(() => router.push(`/research?asset=${id}`), "report")

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Asset Monitoring</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI continuously tracks your assets for signal, narrative and risk changes.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className={cn(buttonVariants({ size: "lg" }), "bg-primary text-primary-foreground hover:bg-primary/90")}
        >
          <Plus className="size-4" /> Track Asset
        </button>
      </div>

      {!ready ? (
        <Panel className="p-8 text-center text-sm text-muted-foreground">Loading watchlist...</Panel>
      ) : tracked.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No assets under monitoring."
          description="Star assets from Market or search here to keep them in your browser watchlist."
          action={
            <div className="flex items-center gap-2.5">
              <Link
                href="/market"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-border bg-surface text-foreground hover:bg-white/5")}
              >
                <Compass className="size-4" /> Explore Market
              </Link>
              <button
                onClick={() => setAddOpen(true)}
                className={cn(buttonVariants({ size: "lg" }), "bg-primary text-primary-foreground hover:bg-primary/90")}
              >
                <Plus className="size-4" /> Track First Asset
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Panel className="min-w-0">
            <PanelHeader
              title="Tracked Assets"
              icon={Radar}
              action={<span className="text-xs text-muted-foreground">{refreshing ? "Refreshing" : `${visibleTracked.length} monitored`}</span>}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Asset</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Narrative</th>
                    <th className="px-4 py-3 font-medium">AI Signal</th>
                    <th className="px-4 py-3 font-medium">Latest Insight</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">Last Updated</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleTracked.map((asset) => (
                    <tr key={asset.id} className="group align-top transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <TokenAvatar id={asset.id} symbol={asset.symbol} color={asset.color} imageUrl={asset.imageUrl} size={34} />
                          <div className="min-w-0">
                            <Link href={`/token/${asset.id}`} className="block truncate text-sm font-medium text-foreground hover:text-primary">
                              {asset.name}
                            </Link>
                            <span className="text-xs text-muted-foreground">{asset.symbol}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                          {asset.category}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-foreground">{assetNarrative(asset)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <AISignalPill signal={aiSignal(asset)} />
                      </td>
                      <td className="max-w-[240px] px-4 py-4">
                        <p className="text-xs leading-relaxed text-muted-foreground" title={asset.event}>
                          {asset.event}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
                        {relativeTime(previousSnapshots[asset.id]?.updatedAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openReport(asset.id)}
                            aria-label={`View research for ${asset.name}`}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <ArrowUpRight className="size-4" />
                          </button>
                          <button
                            aria-label={`Stop tracking ${asset.name}`}
                            onClick={() => removeAsset(asset.id)}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel className="h-fit">
            <PanelHeader
              title="AI Monitoring"
              icon={Zap}
              action={<span className="flex items-center gap-1.5 text-[11px] font-medium text-success"><span className="size-1.5 rounded-full bg-success animate-pulse" /> Live</span>}
            />
            <div className="border-b border-border px-5 py-3">
              <p className="text-xs text-muted-foreground">
                {changes.length} detected {changes.length === 1 ? "change" : "changes"} across tracked assets
              </p>
            </div>
            <ol className="divide-y divide-border">
              {changes.map((change) => {
                const meta = changeMeta[change.type]
                return (
                  <li key={change.id} className="flex gap-3 p-4">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg ring-1", meta.cls)}>
                      <meta.icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground">{change.symbol}</span>
                          <span className="truncate text-xs text-muted-foreground">{change.type}</span>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{change.time}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{change.text}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Panel>
        </div>
      )}

      {addOpen && (
        <AddAssetModal
          tracked={tracked.map((asset) => asset.id)}
          onAdd={addAsset}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  )
}

function AddAssetModal({
  tracked,
  onAdd,
  onClose,
}: {
  tracked: string[]
  onAdd: (asset: Asset) => void
  onClose: () => void
}) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<Asset[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const query = q.trim()
    if (!query) return

    let cancelled = false
    const timeout = window.setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`)
        if (!response.ok) throw new Error(`Search API responded ${response.status}`)
        const data = await response.json() as { assets: Asset[] }
        if (!cancelled && q.trim()) setResults(data.assets.slice(0, 8))
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [q])

  const shownResults = q.trim() ? results : []

  return (
    <ModalShell title="Track an Asset" onClose={onClose}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            const next = e.target.value
            setQ(next)
            if (!next.trim()) {
              setResults([])
              setSearching(false)
            }
          }}
          placeholder="Search token..."
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
        />
        {searching && <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
        {shownResults.map((asset) => {
          const added = tracked.includes(asset.id)
          return (
            <div key={asset.id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/[0.02]">
              <TokenAvatar id={asset.id} symbol={asset.symbol} color={asset.color} imageUrl={asset.imageUrl} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>
                <p className="text-xs text-muted-foreground">{asset.category}</p>
              </div>
              <button
                disabled={added}
                onClick={() => onAdd(asset)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  added
                    ? "cursor-default bg-surface text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {added ? "Added" : <><Plus className="size-3.5" /> Add</>}
              </button>
            </div>
          )
        })}
        {q.trim() && !searching && shownResults.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No assets found.</p>}
        {!q.trim() && <p className="py-8 text-center text-sm text-muted-foreground">Search by token name or symbol.</p>}
      </div>
    </ModalShell>
  )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div className="fixed inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
