"use client"

import { EmptyState } from "@/components/app/empty-state"
import { Panel } from "@/components/app/panel"
import { useAuth } from "@/components/auth/auth-context"
import { TokenAvatar } from "@/components/primitives"
import { buttonVariants } from "@/components/ui/button"
import { getAsset, savedReports, type ReportType } from "@/lib/data"
import { cn } from "@/lib/utils"
import { ArrowUpRight, Compass, Download, FileText, LibraryBig, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

const filters: ("All" | ReportType)[] = ["All", "Full Research Report", "Quick Analysis"]

const typeMeta: Record<ReportType, { icon: typeof Zap; tone: string }> = {
  "Full Research Report": { icon: FileText, tone: "bg-primary/10 text-primary ring-primary/20" },
  "Quick Analysis": { icon: Zap, tone: "bg-surface text-muted-foreground ring-border" },
}

export function LibraryView() {
  const { isConnected, openConnect } = useAuth()
  const router = useRouter()
  const [filter, setFilter] = useState<(typeof filters)[number]>("All")

  const reports = useMemo(
    () => (filter === "All" ? savedReports : savedReports.filter((r) => r.type === filter)),
    [filter],
  )

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
          <p className="mt-1 text-sm text-muted-foreground">Your saved AI-generated research reports.</p>
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

      {reports.length === 0 ? (
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
          {reports.map((r) => {
            const asset = getAsset(r.assetId)
            const meta = typeMeta[r.type]
            return (
              <Panel key={r.id} className="flex flex-col p-5">
                <div className="flex items-center gap-3">
                  <TokenAvatar id={asset.id} symbol={asset.symbol} color={asset.color} size={36} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.symbol}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1", meta.tone)}>
                    <meta.icon className="size-3" /> {r.type}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{r.createdLabel}</span>
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
