"use client"

import { Panel, PanelHeader } from "@/components/app/panel"
import { EmptyState } from "@/components/app/empty-state"
import { ChangeBadge, RiskPill, TokenAvatar } from "@/components/primitives"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-context"
import { aiSignal, assets, getAsset, getResearch, type Asset, type RiskLevel } from "@/lib/data"
import Link from "next/link"
import { useRef, useState } from "react"
import {
  Activity,
  ArrowUpRight,
  Bookmark,
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

type HistoryEntry = { id: string; name: string; date: string; status: "Complete" }

export function ResearchView({ initialId }: { initialId?: string }) {
  const { requireWallet, isConnected, isPro, reportsRemaining, consumeReport, openUpgrade } = useAuth()
  const preset = initialId ? assets.find((a) => a.id === initialId) : undefined
  const [query, setQuery] = useState(preset?.name ?? "")
  const [status, setStatus] = useState<Status>(preset ? "done" : "idle")
  const [asset, setAsset] = useState<Asset | undefined>(preset)
  const [step, setStep] = useState(0)
  const [reportType, setReportType] = useState<ReportType>("quick")
  const [lastType, setLastType] = useState<ReportType>("quick")
  const searchRef = useRef<HTMLInputElement>(null)

  function focusSearch() {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
    searchRef.current?.focus()
  }
  const [history, setHistory] = useState<HistoryEntry[]>([
    { id: "ethereum", name: "Ethereum", date: "Jul 24, 2026", status: "Complete" },
    { id: "chainlink", name: "Chainlink", date: "Jul 22, 2026", status: "Complete" },
    { id: "solana", name: "Solana", date: "Jul 19, 2026", status: "Complete" },
  ])

  function generate(target?: Asset) {
    const found =
      target ??
      assets.find((a) => a.name.toLowerCase() === query.toLowerCase() || a.symbol.toLowerCase() === query.toLowerCase()) ??
      assets[0]
    setQuery(found.name)
    setAsset(found)
    setLastType(reportType)
    setStatus("loading")
    setStep(0)
    let i = 0
    const iv = setInterval(() => {
      i += 1
      setStep(i)
      if (i >= loadingSteps.length) {
        clearInterval(iv)
        setStatus("done")
        setHistory((h) => [
          { id: found.id, name: found.name, date: "Today", status: "Complete" },
          ...h.filter((e) => e.id !== found.id),
        ])
      }
    }, 620)
  }

  // Generating a report is gated: connect wallet first, then enforce the free-tier limit.
  function runWithLimit(fn: () => void) {
    // Pro members have unlimited access.
    if (isPro) {
      fn()
      return
    }
    // Advanced Research is Pass-only; prompt upgrade for free members.
    if (reportType === "deep") {
      openUpgrade()
      return
    }
    // Free members must have remaining reports, otherwise prompt upgrade.
    if (reportsRemaining <= 0) {
      openUpgrade()
      return
    }
    consumeReport()
    fn()
  }

  function guardedGenerate(target?: Asset) {
    requireWallet(() => runWithLimit(() => generate(target)), "report")
  }

  function openHistory(id: string) {
    requireWallet(() => {
      // Re-opening existing history does not consume a free report.
      generate(getAsset(id))
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
    }, "report")
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

      {/* Section 1 — Search panel */}
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
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) guardedGenerate()
                }}
                placeholder="Search Bitcoin, Ethereum, Solana..."
                className="h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={() => guardedGenerate()}
              disabled={status === "loading"}
              className={cn(buttonVariants({ size: "lg" }), "h-12 shrink-0 bg-primary px-6 text-primary-foreground hover:bg-primary/90")}
            >
              {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate Report
            </button>
          </div>
          {isConnected && !isPro && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-xs">
              <span className="text-muted-foreground">
                Free plan · <span className="font-medium text-foreground">{reportsRemaining}</span> of {3} reports left today
              </span>
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

      {/* Section 2 — Generation workflow */}
      {status === "loading" && (
        <Panel className="p-8">
          <div className="mx-auto max-w-md">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Analyzing {asset?.name}…</p>
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
          <ReportHistory history={history} onOpen={openHistory} onDelete={(id) => setHistory((h) => h.filter((e) => e.id !== id))} />
        </div>
      )}

      {/* Section 3–10 — Generated report */}
      {status === "done" && asset && (
        <>
          <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
            <div className="min-w-0">
              <Report asset={asset} reportType={lastType} />
            </div>
            <aside className="hidden lg:block">
              <ReportNav />
            </aside>
          </div>
          <ReportHistory history={history} onOpen={openHistory} onDelete={(id) => setHistory((h) => h.filter((e) => e.id !== id))} />
          <PremiumFeatures />
        </>
      )}
    </div>
  )
}

function Report({ asset, reportType }: { asset: Asset; reportType: ReportType }) {
  const { requireWallet } = useAuth()
  const r = getResearch(asset)
  return (
    <div className="space-y-6">
      {/* Section 3 — Report header */}
      <Panel className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <TokenAvatar id={asset.id} symbol={asset.symbol} color={asset.color} size={48} />
            <div>
              <h2 className="text-xl font-semibold text-foreground">{asset.name} Research Report</h2>
              <p className="text-sm text-muted-foreground">
                {asset.symbol} · {asset.category} · Ranked #{asset.rank}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => requireWallet(() => {}, "export")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bookmark className="size-3.5" /> Save Report
            </button>
            <button
              onClick={() => requireWallet(() => {}, "export")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Download className="size-3.5" /> Export Report
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs sm:grid-cols-4">
          <Meta label="Report Type" value={reportTypeLabel[reportType]} />
          <Meta label="Generated" value="Today, 09:42 UTC" />
          <Meta label="Data Sources" value="6 aggregated feeds" />
          <Meta label="Coverage" value="Fundamentals · Market · Risk" />
        </div>
      </Panel>

      {/* Section 4 — Executive summary */}
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

      {/* Section 5 — Fundamental analysis */}
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

      {/* Section 6 — Market position signals */}
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

      {/* Section 7 — Ecosystem analysis */}
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

      {/* Section 8 — Token analysis */}
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

      {/* Section 9 — Key considerations */}
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

      {/* Section 10 — Analyst insights & outlook */}
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
  onDelete,
}: {
  history: HistoryEntry[]
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <Panel>
        <PanelHeader title="My Research" icon={FileText} />
      {history.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">No saved reports yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {history.map((h) => {
            const a = getAsset(h.id)
            return (
              <div key={h.id} className="flex items-center gap-3 p-4">
                <TokenAvatar id={a.id} symbol={a.symbol} color={a.color} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{h.name} Report</p>
                  <p className="text-xs text-muted-foreground">{h.date}</p>
                </div>
                <span className="hidden rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success sm:inline">
                  {h.status}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpen(h.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Open <ChevronRight className="size-3" />
                  </button>
                  <button
                    aria-label={`Export ${h.name} report`}
                    className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Download className="size-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(h.id)}
                    aria-label={`Delete ${h.name} report`}
                    className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
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
