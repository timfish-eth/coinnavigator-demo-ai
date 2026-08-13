"use client"

import { Panel, PanelHeader } from "@/components/app/panel"
import { EmptyState } from "@/components/app/empty-state"
import { ChangeBadge, RiskPill, TokenAvatar } from "@/components/primitives"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-context"
import { aiSignal, assets, getAsset, getResearch, type Asset, type RiskLevel } from "@/lib/data"
import type { TokenReport } from "@/lib/research-cache"
import { useReportHistory, type StoredReportRecord } from "@/lib/use-report-history"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  Activity,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronRight,
  Coins,
  Crown,
  Download,
  FileText,
  Layers,
  Lightbulb,
  LineChart,
  Loader2,
  Network,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Telescope,
  Trash2,
  Zap,
} from "lucide-react"

type Status = "idle" | "loading" | "done"
type ReportType = "quick" | "deep"
type SearchStatus = "idle" | "searching" | "done"

type MarketSearchResponse = {
  assets: Asset[]
}

const reportTypes: { id: ReportType; label: string; description: string; icon: typeof Zap }[] = [
  { id: "quick", label: "Quick Analysis", description: "Fast overview of fundamentals and market position.", icon: Zap },
  { id: "deep", label: "Advanced Research", description: "Full analyst report: market position, ecosystem, growth drivers and risks.", icon: Telescope },
]

const reportTypeLabel: Record<ReportType, string> = {
  quick: "Quick Analysis",
  deep: "Advanced Research",
}

const loadingSteps = [
  "Collecting market data",
  "Reviewing fundamentals",
  "Evaluating ecosystem",
  "Checking market activity",
  "Generating insights",
]

const popular = [
  { label: "Bitcoin", id: "bitcoin" },
  { label: "Ethereum", id: "ethereum" },
  { label: "Solana", id: "solana" },
  { label: "AI Tokens", id: "render" },
  { label: "RWA Projects", id: "ondo" },
]

export function ResearchView({ initialId }: { initialId?: string }) {
  const { requireWallet, isConnected, isPro, openUpgrade } = useAuth()
  const preset = initialId ? assets.find((a) => a.id === initialId) : undefined
  const [query, setQuery] = useState(preset?.name ?? initialId ?? "")
  const [status, setStatus] = useState<Status>("idle")
  const [asset, setAsset] = useState<Asset | undefined>(preset)
  const [tokenReport, setTokenReport] = useState<TokenReport | undefined>()
  const [step, setStep] = useState(0)
  const [reportType, setReportType] = useState<ReportType>("quick")
  const [lastType, setLastType] = useState<ReportType>("quick")
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(preset)
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle")
  const [searchResults, setSearchResults] = useState<Asset[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const { records: history, upsertReport, removeReport } = useReportHistory()
  const searchRef = useRef<HTMLInputElement>(null)
  const trimmedQuery = query.trim()

  useEffect(() => {
    const q = trimmedQuery
    if (!q || selectedAsset?.name === q || selectedAsset?.symbol.toLowerCase() === q.toLowerCase()) {
      return
    }

    let cancelled = false
    const timeout = window.setTimeout(async () => {
      setSearchStatus("searching")
      try {
        const response = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`)
        if (!response.ok) throw new Error(`Search API responded ${response.status}`)
        const data = await response.json() as MarketSearchResponse
        if (!cancelled) {
          setSearchResults(data.assets.slice(0, 6))
          setSearchStatus("done")
          setSearchOpen(true)
        }
      } catch {
        if (!cancelled) {
          setSearchResults([])
          setSearchStatus("done")
          setSearchOpen(true)
        }
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [selectedAsset?.name, selectedAsset?.symbol, trimmedQuery])

  function focusSearch() {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
    searchRef.current?.focus()
  }
  async function generate(input?: { asset?: Asset; assetId?: string; query?: string; reportType?: ReportType }) {
    const searchTerm = input?.query ?? query.trim()
    const effectiveReportType = input?.reportType ?? reportType
    setLastType(effectiveReportType)
    setStatus("loading")
    setStep(0)
    setTokenReport(undefined)
    if (input?.asset) setAsset(input.asset)
    let i = 0
    const iv = setInterval(() => {
      i += 1
      setStep(Math.min(i, loadingSteps.length - 1))
    }, 620)

    try {
      const params = new URLSearchParams({ type: effectiveReportType })
      if (input?.assetId) params.set("asset", input.assetId)
      else if (input?.asset) params.set("asset", input.asset.id)
      else params.set("q", searchTerm)

      const response = await fetch(`/api/research/token-report?${params.toString()}`)
      if (!response.ok) throw new Error(`Token report API responded ${response.status}`)
      const data = await response.json() as TokenReport
      setQuery(data.asset.name)
      setAsset(data.asset)
      setSelectedAsset(data.asset)
      setSearchOpen(false)
      setTokenReport(data)
      setStep(loadingSteps.length)
      setStatus("done")
      upsertReport({
        asset: data.asset,
        reportType: data.reportType,
        generatedAt: data.generatedAt,
        expiresAt: data.expiresAt,
      })
    } catch {
      const fallback =
        input?.asset ??
        assets.find((a) => a.name.toLowerCase() === searchTerm.toLowerCase() || a.symbol.toLowerCase() === searchTerm.toLowerCase()) ??
        assets[0]
      setQuery(fallback.name)
      setAsset(fallback)
      setStep(loadingSteps.length)
      setStatus("done")
    } finally {
      clearInterval(iv)
    }
  }

  function runProOnly(fn: () => void) {
    if (isPro) {
      fn()
      return
    }
    openUpgrade()
  }

  function guardedGenerate(target?: Asset) {
    const targetAsset = target ?? selectedAsset
    if (!targetAsset) {
      setSearchOpen(true)
      searchRef.current?.focus()
      return
    }
    requireWallet(() => runProOnly(() => void generate({ asset: targetAsset })), "report")
  }

  function chooseSearchResult(result: Asset) {
    setSelectedAsset(result)
    setQuery(result.name)
    setSearchOpen(false)
    searchRef.current?.focus()
  }

  function openHistory(record: StoredReportRecord) {
    requireWallet(() => {
      void openCachedHistory(record)
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
    }, "report")
  }

  async function openCachedHistory(record: StoredReportRecord) {
    setReportType(record.reportType)
    setLastType(record.reportType)
    setStatus("loading")
    setStep(0)
    setTokenReport(undefined)
    try {
      const params = new URLSearchParams({
        asset: record.assetId,
        type: record.reportType,
        cache: "only",
        date: record.generatedAt.slice(0, 10),
      })
      const response = await fetch(`/api/research/token-report?${params.toString()}`)
      if (!response.ok) throw new Error(`Cached report API responded ${response.status}`)
      const data = await response.json() as TokenReport
      setQuery(data.asset.name)
      setAsset(data.asset)
      setSelectedAsset(data.asset)
      setSearchOpen(false)
      setTokenReport(data)
      setStep(loadingSteps.length)
      setStatus("done")
    } catch {
      setStatus("idle")
    }
  }

  async function downloadHistory(record: StoredReportRecord) {
    requireWallet(() => runProOnly(() => {
      void (async () => {
        const params = new URLSearchParams({ asset: record.assetId, type: record.reportType })
        const response = await fetch(`/api/research/token-report/pdf?${params.toString()}`)
        if (!response.ok) return
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${record.assetId}-${record.reportType}-report-${record.generatedAt.slice(0, 10)}.pdf`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
      })()
    }), "export")
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero */}
      <Panel className="relative overflow-hidden p-6 lg:p-8">
        <div className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                <Sparkles className="size-4.5 text-primary" />
              </span>
              {isPro ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent ring-1 ring-accent/25">
                  <Crown className="size-3" /> Research Pass Active
                </span>
              ) : isConnected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
                  Free Member
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground text-balance lg:text-3xl">
              AI Research Agent
            </h1>
            <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
              Generate structured crypto research reports powered by AI. Analyze projects, ecosystems, narratives, and
              market positioning in minutes.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">AI Model</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">Research Agent</p>
              </div>
              <div className="hidden h-8 w-px bg-border sm:block" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Data Sources</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {["Market Data", "News", "Github", "Project Info"].map((s) => (
                    <span
                      key={s}
                      className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-foreground/80"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={focusSearch}
            className={cn(buttonVariants({ size: "lg" }), "shrink-0 bg-primary text-primary-foreground hover:bg-primary/90")}
          >
            <Plus className="size-4" /> Generate Research
          </button>
        </div>
      </Panel>

      {/* Section 1 鈥?Search panel */}
      <Panel className="relative overflow-hidden p-6 lg:p-8">
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <FileText className="size-5 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground text-balance">
            Institutional-grade research on any digital asset
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter an asset to generate a structured report across fundamentals, market position and risk.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  const value = e.target.value
                  setQuery(value)
                  setSelectedAsset(undefined)
                  setSearchOpen(Boolean(value.trim()))
                  if (!value.trim()) {
                    setSearchStatus("idle")
                    setSearchResults([])
                  }
                }}
                onFocus={() => {
                  if (searchResults.length || trimmedQuery) setSearchOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                    if (selectedAsset) guardedGenerate()
                    else setSearchOpen(true)
                  }
                }}
                placeholder="Search token name or symbol..."
                className="h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {searchOpen && trimmedQuery && !selectedAsset && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-border bg-card text-left shadow-2xl">
                  {searchStatus === "searching" ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Searching tokens...
                    </div>
                  ) : searchResults.length ? (
                    <div className="max-h-80 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => chooseSearchResult(result)}
                          className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-surface"
                        >
                          <TokenAvatar id={result.id} symbol={result.symbol} color={result.color} imageUrl={result.imageUrl} size={32} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{result.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {result.symbol} / {result.category} / Rank #{result.rank}
                            </p>
                          </div>
                          <span className="text-xs font-medium text-primary">Select</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No matching tokens found.</div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => guardedGenerate()}
              disabled={status === "loading" || !selectedAsset}
              className={cn(buttonVariants({ size: "lg" }), "h-12 shrink-0 bg-primary px-6 text-primary-foreground hover:bg-primary/90")}
            >
              {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate Report
            </button>
          </div>
          {isConnected && !isPro && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-xs">
              <span className="text-muted-foreground">Research generation and exports require Research Pass.</span>
              <button
                onClick={openUpgrade}
                className="font-medium text-primary hover:underline"
              >
                Upgrade for unlimited
              </button>
            </div>
          )}
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            {reportTypes.map((t) => {
              const active = reportType === t.id
              const locked = t.id === "deep" && !isPro
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    // Advanced Research requires an active Research Pass.
                    if (t.id === "deep" && !isPro) {
                      openUpgrade()
                      return
                    }
                    setReportType(t.id)
                  }}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col rounded-xl border p-4 text-left transition-colors",
                    active
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-surface hover:border-primary/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg",
                        active ? "bg-primary/15 text-primary" : "bg-card text-muted-foreground",
                      )}
                    >
                      <t.icon className="size-4" />
                    </span>
                    {locked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent ring-1 ring-accent/25">
                        <Crown className="size-2.5" /> Research Pass
                      </span>
                    ) : (
                      active && <Check className="size-4 text-primary" />
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">{t.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.description}</p>
                </button>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground">Popular Research:</span>
            {popular.map((p) => (
              <button
                key={p.label}
                onClick={() => guardedGenerate(getAsset(p.id))}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* Section 2 鈥?Generation workflow */}
      {status === "loading" && (
        <Panel className="p-8">
          <div className="mx-auto max-w-md">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Analyzing {asset?.name ?? (query || "asset")}...</p>
            </div>
            <div className="mt-6 space-y-1">
              {loadingSteps.map((s, i) => {
                const state = i < step ? "done" : i === step ? "active" : "pending"
                return (
                  <div
                    key={s}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      state === "active" && "bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                        state === "done"
                          ? "bg-success/15 text-success"
                          : state === "active"
                            ? "bg-primary/15 text-primary"
                            : "bg-surface text-muted-foreground",
                      )}
                    >
                      {state === "done" ? <Check className="size-3" /> : state === "active" ? <Loader2 className="size-3 animate-spin" /> : i + 1}
                    </span>
                    <span className={state === "pending" ? "text-muted-foreground" : "text-foreground"}>{s}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Panel>
      )}

      {/* Empty state */}
      {status === "idle" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <EmptyState
            icon={FileText}
            title="No Research Reports Yet"
            description="Generate your first AI-powered crypto research report."
            action={
              <button
                onClick={() => guardedGenerate()}
                className={cn(buttonVariants({ size: "lg" }), "bg-primary text-primary-foreground hover:bg-primary/90")}
              >
                <Sparkles className="size-4" /> Generate Report
              </button>
            }
          />
          <ReportHistory history={history} onOpen={openHistory} onDownload={downloadHistory} onDelete={removeReport} />
        </div>
      )}

      {/* Section 3鈥?0 鈥?Generated report */}
      {status === "done" && asset && (
        <>
          <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
            <div className="min-w-0">
              <Report asset={asset} reportType={lastType} tokenReport={tokenReport} />
            </div>
            <aside className="hidden space-y-4 lg:block">
              <ReportNav />
              <ReportHistory history={history} onOpen={openHistory} onDownload={downloadHistory} onDelete={removeReport} compact />
            </aside>
          </div>
          <div className="lg:hidden">
            <ReportHistory history={history} onOpen={openHistory} onDownload={downloadHistory} onDelete={removeReport} />
          </div>
          <PremiumFeatures />
        </>
      )}
    </div>
  )
}

function Report({
  asset,
  reportType,
  tokenReport,
}: {
  asset: Asset
  reportType: ReportType
  tokenReport?: TokenReport
}) {
  const { requireWallet, isPro, openUpgrade } = useAuth()
  const r = tokenReport?.report ?? getResearch(asset)

  function requireProExport(fn: () => void) {
    requireWallet(() => {
      if (!isPro) {
        openUpgrade()
        return
      }
      fn()
    }, "export")
  }

  async function downloadPdf() {
    const params = new URLSearchParams({ asset: asset.id, type: reportType })
    const response = await fetch(`/api/research/token-report/pdf?${params.toString()}`)
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${asset.id}-${reportType}-research-${tokenReport?.generatedAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Section 3 鈥?Report header */}
      <Panel className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <TokenAvatar id={asset.id} symbol={asset.symbol} color={asset.color} size={48} />
            <div>
              <h2 className="text-xl font-semibold text-foreground">{asset.name} Research Report</h2>
              <p className="text-sm text-muted-foreground">
                {asset.symbol} / {asset.category} / Ranked #{asset.rank}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => requireProExport(() => void downloadPdf())}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Download className="size-3.5" /> Export Report
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs sm:grid-cols-4">
          <Meta label="Report Type" value={reportTypeLabel[reportType]} />
          <Meta label="Generated" value={tokenReport ? new Date(tokenReport.generatedAt).toLocaleString() : "Today"} />
          <Meta label="Data Sources" value={tokenReport?.cacheStatus === "hit" ? "Cached report" : "Market data + news"} />
          <Meta label="Coverage" value="Fundamentals / Market / Risk" />
        </div>
      </Panel>

      {/* Section 4 鈥?Executive summary */}
      <Panel id="exec-summary" className="scroll-mt-24 overflow-hidden">
        <div className="relative">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-primary/10 blur-3xl" />
          <PanelHeader title="Executive Summary" icon={Sparkles} />
          <div className="relative grid gap-6 p-5 lg:grid-cols-3 lg:p-6">
            <div className="space-y-5 lg:col-span-2">
              <Field title="Project Overview" text={r.overview} />
              <Field title="Market Position" text={r.marketPosition} />
              <div className="grid gap-4 sm:grid-cols-2">
                <ListCard title="Key Strengths" tone="success" items={r.growthDrivers} />
                <ListCard title="Main Risks" tone="destructive" items={r.risks} />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">AI Conclusion</p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{r.summary}</p>
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Composite Rating</p>
                <p className="mt-1 text-3xl font-semibold text-foreground">
                  {r.compositeScore}
                  <span className="text-base text-muted-foreground">/10</span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Data-driven assessment, not investment advice.</p>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Section 5 鈥?Fundamental analysis */}
      <Panel id="fundamentals" className="scroll-mt-24">
        <PanelHeader title="Fundamental Analysis" icon={Boxes} />
        <div className="grid gap-px bg-border/60 md:grid-cols-2">
          {r.fundamentals.map((f) => (
            <div key={f.title} className="bg-card p-5">
              <p className="text-sm font-semibold text-foreground">{f.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                {f.details.map((d) => (
                  <div key={d.label}>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{d.label}</p>
                    <p className="text-sm font-medium text-foreground">{d.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Section 6 鈥?Market position signals */}
      <Panel id="market" className="scroll-mt-24">
        <PanelHeader title="Market Position" icon={LineChart} />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {r.marketInterest.map((m) => (
            <div key={m.label} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{m.value}</p>
                <ChangeBadge value={m.change} className="mt-0.5" />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Section 7 鈥?Ecosystem analysis */}
      <Panel id="ecosystem" className="scroll-mt-24">
        <PanelHeader title="Ecosystem Analysis" icon={Network} />
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.4fr] lg:p-6">
          <div className="grid grid-cols-2 gap-4">
            {[
              ["Network Position", r.ecosystem.layer],
              ["Developer Activity", r.ecosystem.devActivity],
              ["Ecosystem Growth", r.ecosystem.growth],
              ["Applications", asset.rank <= 10 ? "1,200+" : "180+"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs font-medium text-muted-foreground">Related & Competing Assets</p>
            <div className="mt-3 space-y-2">
              {r.related.map((rel) => {
                const a = getAsset(rel.id)
                return (
                  <div key={rel.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <TokenAvatar id={a.id} symbol={a.symbol} color={a.color} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{a.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{rel.reason}</p>
                    </div>
                    <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{a.category}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Panel>

      {/* Section 8 鈥?Token analysis */}
      <Panel id="token" className="scroll-mt-24">
        <PanelHeader title="Token Analysis" icon={Coins} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <tbody>
              {[
                ["Token Utility", r.useCase],
                ["Circulating Supply", asset.id === "bitcoin" ? "19.7M BTC" : "Majority circulating"],
                ["Max Supply", asset.id === "bitcoin" ? "21M BTC (fixed)" : "Variable / capped"],
                ["Distribution", "Broadly distributed across holders"],
                ["Unlock Schedule", asset.rank <= 5 ? "No material unlocks" : "Gradual vesting in progress"],
                ["Inflation", asset.id === "bitcoin" ? "Disinflationary (halving)" : "Low, network-managed"],
              ].map(([l, v], i) => (
                <tr key={l} className={cn("border-b border-border last:border-0", i % 2 === 1 && "bg-surface/40")}>
                  <td className="w-1/3 px-5 py-3.5 text-muted-foreground">{l}</td>
                  <td className="px-5 py-3.5 font-medium text-foreground">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Section 9 鈥?Key considerations */}
      <Panel id="risk" className="scroll-mt-24">
        <PanelHeader title="Key Considerations" icon={ShieldAlert} />
        <div className="divide-y divide-border">
          {r.riskScores.map((rs) => (
            <div key={rs.label} className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{rs.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{riskExplanation(rs.label, rs.level, asset.name)}</p>
              </div>
              <RiskPill level={rs.level} />
            </div>
          ))}
        </div>
        <div className="border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Considerations reflect data-driven analysis of market and network conditions. This is research, not investment advice.
          </p>
        </div>
      </Panel>

      {/* Section 10 鈥?Analyst insights & outlook */}
      <Panel id="outlook" className="scroll-mt-24">
        <PanelHeader title="Analyst Insights & Outlook" icon={Lightbulb} />
        <div className="grid gap-px bg-border/60 sm:grid-cols-2">
          {[
            { icon: Activity, t: "Important Trends", d: `${asset.name} shows ${aiSignal(asset).toLowerCase()} research signals with ${r.ecosystem.growth.toLowerCase()} ecosystem activity across recent sessions.` },
            { icon: ArrowUpRight, t: "Potential Catalysts", d: "Upcoming network milestones, sector rotation and broader liquidity shifts could influence attention and usage." },
            { icon: LineChart, t: "Things To Monitor", d: "Liquidity depth, developer activity, large-wallet behavior and evolving regulatory conditions." },
            { icon: Layers, t: "Market Observations", d: `Positioned within the ${asset.category} sector, ${asset.name} tracks broader market structure while retaining asset-specific drivers.` },
          ].map((i) => (
            <div key={i.t} className="bg-card p-5">
              <div className="flex items-center gap-2">
                <i.icon className="size-4 text-accent" />
                <p className="text-sm font-semibold text-foreground">{i.t}</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{i.d}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

const reportNavItems = [
  { id: "exec-summary", label: "Executive Summary" },
  { id: "market", label: "Market Overview" },
  { id: "fundamentals", label: "Fundamentals" },
  { id: "ecosystem", label: "Ecosystem" },
  { id: "token", label: "Token Analysis" },
  { id: "risk", label: "Risk Framework" },
  { id: "outlook", label: "Outlook" },
]

function ReportNav() {
  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  return (
    <div className="sticky top-24">
      <Panel className="p-4">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">On This Report</p>
        <nav className="mt-2 flex flex-col">
          {reportNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => jump(item.id)}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-border" />
              {item.label}
            </button>
          ))}
        </nav>
      </Panel>
    </div>
  )
}

function ReportHistory({
  history,
  onOpen,
  onDownload,
  onDelete,
  compact = false,
}: {
  history: StoredReportRecord[]
  onOpen: (record: StoredReportRecord) => void
  onDownload: (record: StoredReportRecord) => void | Promise<void>
  onDelete: (id: string) => void
  compact?: boolean
}) {
  return (
    <Panel>
      <PanelHeader
        title="Recent Reports"
        icon={FileText}
        action={<span className="text-xs text-muted-foreground">7 days</span>}
      />
      {history.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">No downloadable reports yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {history.map((h) => (
            <div key={h.id} className={cn("flex gap-3 p-4", compact ? "flex-col" : "items-center")}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <TokenAvatar id={h.assetId} symbol={h.symbol} color={h.color} imageUrl={h.imageUrl} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{h.assetName} Report</p>
                  <p className="text-xs text-muted-foreground">
                    {formatReportHistoryDate(h.generatedAt)} / {h.reportType === "deep" ? "Advanced" : "Quick"}
                  </p>
                </div>
              </div>
              <div className={cn("flex items-center gap-1", compact ? "justify-end" : "shrink-0")}>
                <button
                  onClick={() => onOpen(h)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Open <ChevronRight className="size-3" />
                </button>
                <button
                  onClick={() => void onDownload(h)}
                  aria-label={`Download ${h.assetName} report`}
                  className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Download className="size-3.5" />
                </button>
                <button
                  onClick={() => onDelete(h.id)}
                  aria-label={`Delete ${h.assetName} report record`}
                  className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

function formatReportHistoryDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function PremiumFeatures() {
  const features = ["Deep Reports", "Historical Comparison", "Advanced Risk Analysis", "PDF Export", "Unlimited Research"]
  return (
    <Panel className="overflow-hidden">
      <div className="relative flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
        <div className="absolute -left-10 -top-10 size-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Crown className="size-4 text-accent" />
            <h3 className="text-base font-semibold text-foreground">Unlock Advanced Research</h3>
          </div>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Access deeper coverage, historical comparisons and unlimited report generation.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {features.map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <Check className="size-3 text-accent" /> {f}
              </span>
            ))}
          </div>
        </div>
        <Link href="/settings" className={cn(buttonVariants({ size: "lg" }), "relative shrink-0 bg-primary text-primary-foreground hover:bg-primary/90")}>
          <Crown className="size-4" /> Upgrade to Pro
        </Link>
      </div>
    </Panel>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-foreground">{value}</p>
    </div>
  )
}

function Field({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{title}</p>
      <p className="mt-2 leading-relaxed text-foreground/90">{text}</p>
    </div>
  )
}

function ListCard({ title, tone, items }: { title: string; tone: "success" | "destructive"; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className={cn("text-sm font-semibold", tone === "success" ? "text-success" : "text-destructive")}>{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", tone === "success" ? "bg-success" : "bg-destructive")} />
            {i}
          </li>
        ))}
      </ul>
    </div>
  )
}

function riskExplanation(label: string, level: RiskLevel, name: string): string {
  const map: Record<string, Record<RiskLevel, string>> = {
    "Market Risk": {
      Low: `${name} shows relatively contained volatility versus the broader market.`,
      Medium: `${name} carries moderate price volatility across market cycles.`,
      High: `High price volatility compared with large-cap assets.`,
    },
    "Liquidity Risk": {
      Low: "Deep liquidity and broad market access reduce execution risk.",
      Medium: "Adequate liquidity, though depth can thin during volatility.",
      High: "Thinner liquidity may amplify price impact during stress.",
    },
    "Technology Risk": {
      Low: "Mature, battle-tested protocol with a strong stability record.",
      Medium: "Actively evolving technology with ongoing upgrade cycles.",
      High: "Earlier-stage technology with higher execution uncertainty.",
    },
    "Centralization Risk": {
      Low: "Highly distributed control across validators and participants.",
      Medium: "Moderate concentration among core contributors or validators.",
      High: "Notable concentration of control or token distribution.",
    },
    "Regulatory Risk": {
      Low: "Limited direct exposure to shifting regulatory frameworks.",
      Medium: "Subject to evolving policy that could affect adoption.",
      High: "Elevated sensitivity to regulatory classification and policy.",
    },
  }
  return map[label]?.[level] ?? "Data-driven assessment of current conditions."
}

