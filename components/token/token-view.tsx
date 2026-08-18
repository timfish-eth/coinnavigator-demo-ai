"use client"

import { Panel, PanelHeader } from "@/components/app/panel"
import { useAuth } from "@/components/auth/auth-context"
import { TokenAvatar } from "@/components/primitives"
import { buttonVariants } from "@/components/ui/button"
import { chainOf, getResearch, type Asset, type Impact, type Research } from "@/lib/data"
import { useWatchlist } from "@/lib/use-watchlist"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Code2,
  Globe,
  Info,
  Newspaper,
  ShieldAlert,
  Sparkles,
} from "lucide-react"

const impactTone: Record<Impact, string> = {
  High: "bg-destructive/10 text-destructive ring-destructive/20",
  Medium: "bg-warning/10 text-warning ring-warning/20",
  Low: "bg-muted-foreground/10 text-muted-foreground ring-muted-foreground/20",
}

export function TokenView({ asset, research: initialResearch }: { asset: Asset; research?: Research }) {
  const { requireWallet } = useAuth()
  const router = useRouter()
  const { isSaved, toggleAsset } = useWatchlist()
  const research = initialResearch ?? getResearch(asset)
  const bookmarked = isSaved(asset.id)

  const addToWatchlist = () => toggleAsset(asset)
  const generateReport = () => requireWallet(() => router.push(`/research?asset=${asset.id}`), "report")

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Research disclaimer */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
        <Info className="size-3.5 shrink-0 text-primary" />
        <span>AI-generated research for informational purposes — not financial or investment advice.</span>
      </div>

      {/* HEADER */}
      <Panel className="p-5 lg:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <TokenAvatar id={asset.id} symbol={asset.symbol} color={asset.color} imageUrl={asset.imageUrl} size={56} />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{asset.name}</h1>
                <span className="rounded-md bg-surface px-2 py-0.5 text-sm font-medium text-muted-foreground ring-1 ring-border">
                  {asset.symbol}
                </span>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {asset.category}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm">
                <div>
                  <span className="text-muted-foreground">Market Cap </span>
                  <span className="font-medium text-foreground">{asset.marketCap}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Price </span>
                  <span className="font-medium tabular-nums text-foreground">
                    ${asset.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Chain </span>
                  <span className="font-medium text-foreground">{chainOf(asset)}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href={`https://${research.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Globe className="size-3.5" /> Website
                </a>
                <a
                  href={`https://github.com/search?q=${encodeURIComponent(`${asset.name} ${asset.symbol}`)}&type=repositories`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Code2 className="size-3.5" /> GitHub
                </a>
              </div>
            </div>
          </div>
          <button
            onClick={addToWatchlist}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "shrink-0 border-border bg-surface text-foreground hover:bg-white/5",
              bookmarked && "border-primary/40 text-primary",
            )}
          >
            {bookmarked ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
            {bookmarked ? "Saved" : "Add to Watchlist"}
          </button>
        </div>
      </Panel>

      {/* 1 — AI Summary */}
      <Panel>
        <PanelHeader title="AI Summary" icon={Sparkles} action={<span className="text-xs text-muted-foreground">Project overview</span>} />
        <div className="space-y-4 p-5">
          <p className="text-[15px] leading-relaxed text-foreground/90">{research.overview}</p>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">AI Assessment</p>
            <p className="mt-2 leading-relaxed text-foreground/90">{research.summary}</p>
          </div>
        </div>
      </Panel>

      {/* 2 — Why It Matters */}
      <Panel>
        <PanelHeader title="Why It Matters" icon={ArrowUpRight} action={<span className="text-xs text-muted-foreground">Growth factors</span>} />
        <div className="grid gap-2 p-5 sm:grid-cols-2">
          {research.growthDrivers.map((d) => (
            <div key={d} className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm text-foreground/90">
              <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-success" />
              {d}
            </div>
          ))}
        </div>
      </Panel>

      {/* 3 — Risks */}
      <Panel>
        <PanelHeader
          title="Key Considerations"
          icon={ShieldAlert}
          action={<span className="text-xs text-muted-foreground">Risks to weigh</span>}
        />
        <div className="grid gap-2 p-5 sm:grid-cols-2">
          {research.risks.map((r) => (
            <div key={r} className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
              {r}
            </div>
          ))}
        </div>
      </Panel>

      {/* 4 — Latest News */}
      <Panel>
        <PanelHeader title="Latest Intelligence" icon={Newspaper} action={<span className="text-xs text-muted-foreground">Recent updates</span>} />
        <ol className="p-5">
          {research.latestIntel.map((item, i, arr) => (
            <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
              <div className="flex flex-col items-center">
                <span className="mt-1 size-2.5 rounded-full bg-primary ring-4 ring-primary/10" />
                {i < arr.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.time}</span>
                  <span className="text-border">·</span>
                  <span className="rounded bg-surface px-1.5 py-0.5 font-medium text-foreground ring-1 ring-border">
                    {item.source}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-foreground">{item.headline}</p>
                <span className={cn("mt-1.5 inline-flex rounded px-2 py-0.5 text-[11px] font-medium ring-1", impactTone[item.impact])}>
                  {item.impact} impact
                </span>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      {/* 5 — Generate AI Research Report */}
      <Panel className="overflow-hidden">
        <div className="relative flex flex-col items-start gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="absolute -right-8 -top-12 size-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Sparkles className="size-5 text-primary" /> Generate AI Research Report
            </h3>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Create a full AI-generated report covering market position, ecosystem, growth drivers and risks for {asset.name}.
            </p>
          </div>
          <button
            onClick={generateReport}
            className={cn(buttonVariants({ size: "lg" }), "relative shrink-0 bg-primary text-primary-foreground hover:bg-primary/90")}
          >
            <Sparkles className="size-4" /> Generate Report
          </button>
        </div>
      </Panel>
    </div>
  )
}
