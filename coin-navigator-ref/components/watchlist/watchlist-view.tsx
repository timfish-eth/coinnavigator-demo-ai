"use client"

import { EmptyState } from "@/components/app/empty-state"
import { Panel, PanelHeader } from "@/components/app/panel"
import { useAuth } from "@/components/auth/auth-context"
import { AISignalPill, TokenAvatar } from "@/components/primitives"
import { buttonVariants } from "@/components/ui/button"
import { aiSignal, assetNarrative, assets as allAssets, lastUpdatedLabel, type Asset, type AISignal } from "@/lib/data"
import { cn } from "@/lib/utils"
import { ArrowUpRight, Bookmark, Compass, Plus, Radar, Search, Trash2, TrendingDown, TrendingUp, X, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

/* ---------- AI monitoring detection ---------- */

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

// Derive detected changes for the tracked set from each asset's live signal + event.
function detectChanges(tracked: Asset[]): DetectedChange[] {
  return tracked.map((a) => {
    const signal = aiSignal(a)
    let type: ChangeType = "New Insight"
    let text = a.event
    if (a.signal === "Bullish") {
      type = a.activity >= 80 ? "Signal Change" : "Narrative Shift"
      text = `AI signal strengthened to Positive — ${a.event.toLowerCase()}`
    } else if (a.signal === "Bearish") {
      type = "Risk Flag"
      text = `Flagged for review — ${a.event.toLowerCase()}`
    } else {
      type = "New Insight"
      text = `${a.event}`
    }
    return {
      id: a.id,
      symbol: a.symbol,
      color: a.color,
      assetName: a.name,
      type,
      signal,
      text,
      time: lastUpdatedLabel(a),
    }
  })
}

const changeMeta: Record<ChangeType, { icon: typeof Zap; cls: string }> = {
  "Signal Change": { icon: TrendingUp, cls: "bg-success/10 text-success ring-success/20" },
  "Narrative Shift": { icon: Radar, cls: "bg-primary/10 text-primary ring-primary/20" },
  "New Insight": { icon: Zap, cls: "bg-muted-foreground/10 text-muted-foreground ring-muted-foreground/20" },
  "Risk Flag": { icon: TrendingDown, cls: "bg-warning/10 text-warning ring-warning/20" },
}

// A default research list of the most-followed assets.
const DEFAULT_IDS = ["bitcoin", "ethereum", "render", "ondo", "chainlink"]

export function WatchlistView() {
  const { requireWallet } = useAuth()
  const router = useRouter()
  const [ids, setIds] = useState<string[]>(DEFAULT_IDS)
  const [addOpen, setAddOpen] = useState(false)

  const tracked = useMemo(() => allAssets.filter((a) => ids.includes(a.id)), [ids])
  const changes = useMemo(() => detectChanges(tracked), [tracked])

  function addAsset(id: string) {
    setIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }
  function removeAsset(id: string) {
    setIds((prev) => prev.filter((x) => x !== id))
  }
  const openReport = (id: string) => requireWallet(() => router.push(`/research?asset=${id}`), "report")

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Asset Monitoring</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI continuously tracks your assets for signal, narrative and risk changes.
          </p>
        </div>
        <button
          onClick={() => requireWallet(() => setAddOpen(true), "watchlist")}
          className={cn(buttonVariants({ size: "lg" }), "bg-primary text-primary-foreground hover:bg-primary/90")}
        >
          <Plus className="size-4" /> Track Asset
        </button>
      </div>

      {tracked.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No assets under monitoring."
          description="Track crypto assets to let AI monitor their signals, narratives and risks."
          action={
            <div className="flex items-center gap-2.5">
              <Link
                href="/market"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-border bg-surface text-foreground hover:bg-white/5")}
              >
                <Compass className="size-4" /> Explore Market
              </Link>
              <button
                onClick={() => requireWallet(() => setAddOpen(true), "watchlist")}
                className={cn(buttonVariants({ size: "lg" }), "bg-primary text-primary-foreground hover:bg-primary/90")}
              >
                <Plus className="size-4" /> Track First Asset
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Monitoring table */}
          <Panel className="min-w-0">
            <PanelHeader
              title="Tracked Assets"
              icon={Radar}
              action={<span className="text-xs text-muted-foreground">{tracked.length} monitored</span>}
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
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Last Updated</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tracked.map((a) => (
                    <tr key={a.id} className="group align-top transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <TokenAvatar id={a.id} symbol={a.symbol} color={a.color} size={34} />
                          <div className="min-w-0">
                            <Link href={`/token/${a.id}`} className="block truncate text-sm font-medium text-foreground hover:text-primary">
                              {a.name}
                            </Link>
                            <span className="text-xs text-muted-foreground">{a.symbol}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                          {a.category}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-foreground">{assetNarrative(a)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <AISignalPill signal={aiSignal(a)} />
                      </td>
                      <td className="max-w-[240px] px-4 py-4">
                        <p className="text-xs leading-relaxed text-muted-foreground" title={a.event}>
                          {a.event}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">{lastUpdatedLabel(a)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openReport(a.id)}
                            aria-label={`View research for ${a.name}`}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <ArrowUpRight className="size-4" />
                          </button>
                          <button
                            aria-label={`Stop tracking ${a.name}`}
                            onClick={() => removeAsset(a.id)}
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

          {/* AI Monitoring sidebar */}
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
              {changes.map((c) => {
                const meta = changeMeta[c.type]
                return (
                  <li key={c.id} className="flex gap-3 p-4">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg ring-1", meta.cls)}>
                      <meta.icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground">{c.symbol}</span>
                          <span className="truncate text-xs text-muted-foreground">{c.type}</span>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{c.time}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.text}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Panel>
        </div>
      )}

      {/* Track asset modal */}
      {addOpen && <AddAssetModal tracked={ids} onAdd={addAsset} onClose={() => setAddOpen(false)} />}
    </div>
  )
}

/* ---------- Add Asset Modal ---------- */

function AddAssetModal({
  tracked,
  onAdd,
  onClose,
}: {
  tracked: string[]
  onAdd: (id: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState("")
  const results = allAssets.filter(
    (a) => a.name.toLowerCase().includes(q.toLowerCase()) || a.symbol.toLowerCase().includes(q.toLowerCase()),
  )
  return (
    <ModalShell title="Track an Asset" onClose={onClose}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search token..."
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
        />
      </div>
      <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
        {results.map((a: Asset) => {
          const added = tracked.includes(a.id)
          return (
            <div key={a.id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/[0.02]">
              <TokenAvatar id={a.id} symbol={a.symbol} color={a.color} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.category}</p>
              </div>
              <button
                disabled={added}
                onClick={() => onAdd(a.id)}
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
        {results.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No assets found.</p>}
      </div>
    </ModalShell>
  )
}

/* ---------- Shared modal shell ---------- */

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
