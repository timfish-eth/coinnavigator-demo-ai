"use client"

import { EmptyState } from "@/components/app/empty-state"
import { Panel } from "@/components/app/panel"
import { useAuth } from "@/components/auth/auth-context"
import { TokenAvatar } from "@/components/primitives"
import { buttonVariants } from "@/components/ui/button"
import type { Asset, ReportType } from "@/lib/data"
import { cn } from "@/lib/utils"
import { ArrowUpRight, Compass, Download, FileText, LibraryBig, Loader2, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

const filters: ("All" | ReportType)[] = ["All", "Full Research Report", "Quick Analysis"]

const typeMeta: Record<ReportType, { icon: typeof Zap; tone: string }> = {
  "Full Research Report": { icon: FileText, tone: "bg-primary/10 text-primary ring-primary/20" },
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

function reportTypeLabel(reportType: StoredReportSummary["reportType"]): ReportType {
  return reportType === "deep" ? "Full Research Report" : "Quick Analysis"
}

export function LibraryView() {
  const { isConnected, isPro, openConnect, openUpgrade } = useAuth()
  const router = useRouter()
  const [filter, setFilter] = useState<(typeof filters)[number]>("All")
  const [reports, setReports] = useState<StoredReportSummary[]>([])
  const [loading, setLoading] = useState(true)

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

  const visibleReports = useMemo(
    () => (filter === "All" ? reports : reports.filter((r) => reportTypeLabel(r.reportType) === filter)),
    [filter, reports],
  )

  async function exportReport(report: StoredReportSummary) {
    if (!isPro) {
      openUpgrade()
      return
    }
    const params = new URLSearchParams({ asset: report.asset.id, type: report.reportType })
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

      {/* Filter chips */}
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
                  <span className="text-[11px] text-muted-foreground">{new Date(r.generatedAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty">{r.summary}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => router.push(`/research?asset=${asset.id}`)}
                    className={cn(buttonVariants({ size: "sm" }), "bg-primary text-primary-foreground hover:bg-primary/90")}
                  >
                    <ArrowUpRight className="size-3.5" /> Open
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
    </div>
  )
}
