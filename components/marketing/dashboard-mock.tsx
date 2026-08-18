import { ChangeBadge, Sparkline, TokenAvatar } from "@/components/primitives"
import { assets } from "@/lib/data"
import { AlertTriangle, Bell, Bookmark, LayoutDashboard, LineChart, Search, Settings, Sparkles } from "lucide-react"

const navIcons = [LayoutDashboard, LineChart, Sparkles, Bookmark, Bell, Settings]

/** Compact, static representation of the CoinNavigator product UI for marketing use. */
export function DashboardMock({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const rows = assets.slice(0, variant === "full" ? 6 : 4)
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/40">
      {/* window bar */}
      <div className="flex items-center gap-2 border-b border-border bg-background/60 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/70" />
        <span className="size-2.5 rounded-full bg-warning/70" />
        <span className="size-2.5 rounded-full bg-success/70" />
        <div className="ml-3 flex h-6 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-2 text-[10px] text-muted-foreground">
          <Search className="size-3" />
          app.coinnavigator.io/dashboard
        </div>
      </div>
      <div className="flex">
        {/* mini sidebar */}
        <div className="hidden w-12 flex-col items-center gap-3 border-r border-border bg-sidebar py-4 sm:flex">
          {navIcons.map((Icon, i) => (
            <div
              key={i}
              className={`flex size-8 items-center justify-center rounded-lg ${i === 0 ? "bg-primary/20 text-primary ring-1 ring-primary/30" : "text-muted-foreground"}`}
            >
              <Icon className="size-4" />
            </div>
          ))}
        </div>
        {/* content */}
        <div className="min-w-0 flex-1 space-y-3 p-4">
          {/* stat cards */}
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[
              { label: "Total Market Cap", value: "$2.41T", change: 1.8 },
              { label: "24h Volume", value: "$96.4B", change: 3.2 },
              { label: "BTC Dominance", value: "54.2%", change: -0.4 },
              { label: "Sentiment", value: "Greed 72", change: 5.1 },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border border-border bg-card p-2.5">
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{c.value}</p>
                <ChangeBadge value={c.change} className="mt-1 scale-90 origin-left" />
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {/* AI summary */}
            <div className="rounded-lg border border-border bg-card p-3 lg:col-span-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-accent" />
                <p className="text-xs font-semibold text-foreground">AI Market Summary</p>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Crypto markets remain stable as BTC maintains momentum while AI and RWA sectors show increased activity
                across on-chain metrics.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {["Trend: Stable", "Risk: Low", "AI sector +8.4%"].map((t) => (
                  <span key={t} className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            {/* watchlist */}
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-semibold text-foreground">Watchlist</p>
              <div className="mt-2 space-y-2">
                {assets.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <TokenAvatar id={a.id} symbol={a.symbol} color={a.color} size={20} />
                    <span className="text-[11px] font-medium text-foreground">{a.symbol}</span>
                    <span className="ml-auto text-[10px] font-medium tabular-nums" style={{ color: a.change24h >= 0 ? "var(--color-success)" : "var(--color-destructive)" }}>
                      {a.change24h >= 0 ? "+" : ""}
                      {a.change24h}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* trending table */}
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Trending Assets</p>
              <AlertTriangle className="size-3.5 text-warning" />
            </div>
            <div className="space-y-1.5">
              {rows.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <TokenAvatar id={a.id} symbol={a.symbol} color={a.color} size={22} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium leading-tight text-foreground">{a.symbol}</p>
                    <p className="text-[9px] leading-tight text-muted-foreground">{a.name}</p>
                  </div>
                  <span className="ml-auto text-[11px] font-medium tabular-nums text-foreground">
                    ${a.price.toLocaleString("en-US")}
                  </span>
                  <div className="w-16">
                    <Sparkline data={a.trend} positive={a.change24h >= 0} width={64} height={20} />
                  </div>
                  <span className="w-12 text-right text-[10px] font-medium tabular-nums" style={{ color: a.change24h >= 0 ? "var(--color-success)" : "var(--color-destructive)" }}>
                    {a.change24h >= 0 ? "+" : ""}
                    {a.change24h}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
