"use client"

import { EmptyState } from "@/components/app/empty-state"
import { Panel } from "@/components/app/panel"
import { useAuth } from "@/components/auth/auth-context"
import { TokenAvatar } from "@/components/primitives"
import { buttonVariants } from "@/components/ui/button"
import type { Asset } from "@/lib/data"
import type { TokenReport } from "@/lib/research-cache"
import { cn } from "@/lib/utils"
import { ArrowUpRight, Compass, Download, FileText, LibraryBig, LineChart, Loader2, Search, ShieldAlert, X, Zap } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type DisplayReportType = "Quick Analysis" | "Full Analysis"

const filters: ("All" | DisplayReportType)[] = ["All", "Full Analysis", "Quick Analysis"]

const typeMeta: Record<DisplayReportType, { icon: typeof Zap; tone: string }> = {
  "Full Analysis": { icon: FileText, tone: "bg-primary/10 text-primary ring-primary/20" },
  "Quick Analysis": { icon: Zap, tone: "bg-surface text-muted-foreground ring-border" },
}

type StoredReportSummary = {
  id: string
  asset: Asset
  reportType: "quick" | "deep"
  generatedAt: string
  expiresAt: string
  summary: string
}

function reportTypeLabel(reportType: StoredReportSummary["reportType"]): DisplayReportType {
  return reportType === "deep" ? "Full Analysis" : "Quick Analysis"
}

export function LibraryView() {
  const { isConnected, isPro, openConnect, openUpgrade } = useAuth()
  const [filter, setFilter] = useState<(typeof filters)[number]>("All")
  const [reports, setReports] = useState<StoredReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<TokenReport | null>(null)
  const [openingReportId, setOpeningReportId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let cancelled = false
    async function loadReports() {
      setLoading(true)
      try {
        const response = await fetch("/api/research/reports")
        if (!response.ok) throw new Error(`Reports API responded ${response.status}`)
        const data = await response.json() as { reports: StoredReportSummary[] }
        if (!cancelled) setReports(data.reports)
      } catch {
        if (!cancelled) setReports([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadReports()
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const full = reports.filter((report) => report.reportType === "deep").length
    const quick = reports.filter((report) => report.reportType === "quick").length
    const latest = reports[0]?.generatedAt ? new Date(reports[0].generatedAt).toLocaleDateString("en-US") : "None"
    return { total: reports.length, full, quick, latest }
  }, [reports])

  const visibleReports = useMemo(() => {
    const term = search.trim().toLowerCase()
    return reports.filter((report) => {
      const matchesFilter = filter === "All" || reportTypeLabel(report.reportType) === filter
      const matchesSearch = !term || [
        report.asset.name,
        report.asset.symbol,
        report.asset.category,
        report.summary,
        reportTypeLabel(report.reportType),
      ].some((value) => value.toLowerCase().includes(term))
      return matchesFilter && matchesSearch
    })
  }, [filter, reports, search])

  async function exportReport(report: StoredReportSummary) {
    if (!isPro) {
      openUpgrade()
      return
    }
    const params = new URLSearchParams({ id: report.id })
    const response = await fetch(`/api/research/token-report/pdf?${params.toString()}`)
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${report.asset.id}-${report.reportType}-research-${report.generatedAt.slice(0, 10)}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function openReport(report: StoredReportSummary) {
    setOpeningReportId(report.id)
    try {
      const params = new URLSearchParams({ id: report.id })
      const response = await fetch(`/api/research/reports?${params.toString()}`)
      if (!response.ok) return
      const data = await response.json() as { report: TokenReport }
      setSelectedReport(data.report)
    } finally {
      setOpeningReportId(null)
    }
  }

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-6xl">
        <EmptyState
          icon={LibraryBig}
          title="Connect wallet to view your research library"
          description="Your saved AI research reports are tied to your wallet so you can revisit them anytime."
          action={
            <button
              onClick={() => openConnect("generic")}
              className={cn(buttonVariants({ size: "lg" }), "bg-primary text-primary-foreground hover:bg-primary/90")}
            >
              Connect Wallet
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Research Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">Previously generated AI research reports available on this server.</p>
        </div>
        <Link
          href="/research"
          className={cn(buttonVariants({ size: "lg" }), "bg-primary text-primary-foreground hover:bg-primary/90")}
        >
          <FileText className="size-4" /> New Report
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <LibraryMetric label="Total Reports" value={String(stats.total)} />
        <LibraryMetric label="Full Analysis" value={String(stats.full)} />
        <LibraryMetric label="Quick Analysis" value={String(stats.quick)} />
        <LibraryMetric label="Latest" value={stats.latest} />
      </div>

      <Panel className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search token, symbol, category or summary..."
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </Panel>

      {loading ? (
        <Panel className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading reports...
        </Panel>
      ) : visibleReports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Generate your first AI research report to start building your library."
          action={
            <Link
              href="/market"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-border bg-surface text-foreground hover:bg-white/5")}
            >
              <Compass className="size-4" /> Explore Market
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleReports.map((r) => {
            const asset = r.asset
            const type = reportTypeLabel(r.reportType)
            const meta = typeMeta[type]
            return (
              <Panel key={r.id} className="flex flex-col p-5">
                <div className="flex items-center gap-3">
                  <TokenAvatar id={asset.id} symbol={asset.symbol} color={asset.color} imageUrl={asset.imageUrl} size={36} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.symbol}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1", meta.tone)}>
                    <meta.icon className="size-3" /> {type}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{new Date(r.generatedAt).toLocaleDateString("en-US")}</span>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty">{r.summary}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void openReport(r)}
                    className={cn(buttonVariants({ size: "sm" }), "bg-primary text-primary-foreground hover:bg-primary/90")}
                  >
                    {openingReportId === r.id ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUpRight className="size-3.5" />}
                    Open
                  </button>
                  <button
                    onClick={() => void exportReport(r)}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-border bg-surface text-foreground hover:bg-white/5")}
                  >
                    <Download className="size-3.5" /> Export
                  </button>
                </div>
              </Panel>
            )
          })}
        </div>
      )}
      {selectedReport && <ReportReader report={selectedReport} onClose={() => setSelectedReport(null)} onExport={() => void exportSelectedReport(selectedReport, isPro, openUpgrade)} />}
    </div>
  )
}

function LibraryMetric({ label, value }: { label: string; value: string }) {
  return (
    <Panel className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </Panel>
  )
}

async function exportSelectedReport(report: TokenReport, isPro: boolean, openUpgrade: () => void) {
  if (!isPro) {
    openUpgrade()
    return
  }
  const params = new URLSearchParams({ id: report.id })
  const response = await fetch(`/api/research/token-report/pdf?${params.toString()}`)
  if (!response.ok) return
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${report.asset.id}-${report.reportType}-research-${report.generatedAt.slice(0, 10)}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function ReportReader({ report, onClose, onExport }: { report: TokenReport; onClose: () => void; onExport: () => void }) {
  const { asset, report: research } = report
  const type = reportTypeLabel(report.reportType)
  const isDeep = report.reportType === "deep"

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-border bg-card/95 p-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <TokenAvatar id={asset.id} symbol={asset.symbol} color={asset.color} imageUrl={asset.imageUrl} size={42} />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-foreground">{asset.name} {type}</h2>
              <p className="text-xs text-muted-foreground">
                {asset.symbol} / {asset.category} / {new Date(report.generatedAt).toLocaleString("en-US")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-border bg-surface text-foreground hover:bg-white/5")}
            >
              <Download className="size-3.5" /> Export
            </button>
            <button
              onClick={onClose}
              aria-label="Close report"
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5 lg:p-6">
          <Panel className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Executive Summary</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">{research.summary}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="Composite Rating" value={`${research.compositeScore}/10`} />
              <Metric label="Report Type" value={type} />
              <Metric label="Data Sources" value={report.cacheStatus === "hit" ? "Stored report" : "Market data + news"} />
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <TextPanel title="Project Overview" body={research.overview} />
            <TextPanel title="Market Position" body={research.marketPosition} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <ListPanel title="Key Strengths" items={research.growthDrivers} />
            <ListPanel title="Main Risks" items={research.risks} icon={ShieldAlert} />
          </div>

          <Panel className="overflow-hidden">
            <div className="border-b border-border p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <LineChart className="size-4 text-primary" /> Market Signals
              </h3>
            </div>
            <div className="grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
              {research.marketInterest.map((item) => (
                <div key={item.label} className="bg-card p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </Panel>

          {isDeep && (
            <>
              <Panel className="overflow-hidden">
                <div className="border-b border-border bg-surface/50 p-5">
                  <h3 className="text-sm font-semibold text-foreground">Full Analysis Map</h3>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                    Expanded review across fundamentals, macro context, liquidity proxies, ecosystem durability and risk structure.
                  </p>
                </div>
                <div className="grid gap-4 p-5 md:grid-cols-2">
                  {research.fundamentals.map((item) => (
                    <div key={item.title} className="rounded-xl border border-border bg-surface p-5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/20">
                          Full
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {item.details.map((detail) => (
                          <div key={detail.label} className="rounded-lg border border-border bg-card px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{detail.label}</p>
                            <p className="text-sm font-medium text-foreground">{detail.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className="overflow-hidden">
                <div className="border-b border-border p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <LineChart className="size-4 text-primary" /> Financial & Liquidity Signals
                  </h3>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  {[...research.onchain, ...research.social].map((item) => (
                    <div key={item.label} className="rounded-xl border border-border bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.label}</p>
                          {"hint" in item && typeof item.hint === "string" && (
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.hint}</p>
                          )}
                        </div>
                        <span className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-medium ring-1",
                          item.change >= 0
                            ? "bg-success/10 text-success ring-success/20"
                            : "bg-destructive/10 text-destructive ring-destructive/20",
                        )}>
                          {item.change >= 0 ? "+" : ""}{item.change.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-4 text-lg font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className="overflow-hidden">
                <div className="border-b border-border bg-surface/50 p-5">
                  <h3 className="text-sm font-semibold text-foreground">Risk Framework</h3>
                </div>
                <div className="grid gap-3 p-5">
                  {research.riskScores.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.note}</p>
                      </div>
                      <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-muted-foreground ring-1 ring-border">{item.level}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function TextPanel({ title, body }: { title: string; body: string }) {
  return (
    <Panel className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </Panel>
  )
}

function ListPanel({ title, items, icon: Icon = FileText }: { title: string; items: string[]; icon?: typeof FileText }) {
  return (
    <Panel className="p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 text-primary" /> {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
