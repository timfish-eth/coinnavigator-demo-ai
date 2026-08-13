"use client"

import { activityLabel, aiScore, aiSignal, assets, intelligenceFeed, narratives } from "@/lib/data"
import { AISignalPill, TokenAvatar } from "@/components/primitives"
import { cn } from "@/lib/utils"
import {
  ArrowUpRight,
  Clock,
  CornerDownLeft,
  FileText,
  Hash,
  Layers,
  Newspaper,
  Search,
  TrendingUp,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type FlatItem = {
  key: string
  group: string
  href: string
  label: string
  render: () => React.ReactNode
}

const POPULAR = ["Bitcoin", "AI tokens", "Ethereum research", "RWA narrative", "Solana"]

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Load recent searches (UI convenience state)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cn-recent-searches")
      if (raw) setRecent(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery("")
      setActive(0)
      // focus after paint
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const q = query.trim().toLowerCase()

  const matchedAssets = useMemo(() => {
    if (!q) return []
    return assets
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.symbol.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q),
      )
      .slice(0, 5)
  }, [q])

  const matchedReports = useMemo(() => {
    if (!q) return []
    return assets
      .filter((a) => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q))
      .slice(0, 3)
  }, [q])

  const matchedIntel = useMemo(() => {
    if (!q) return []
    return intelligenceFeed
      .filter((i) => i.title.toLowerCase().includes(q) || i.type.toLowerCase().includes(q))
      .slice(0, 3)
  }, [q])

  const matchedTopics = useMemo(() => {
    if (!q) return []
    return narratives
      .filter((n) => n.name.toLowerCase().includes(q) || n.note.toLowerCase().includes(q))
      .slice(0, 4)
  }, [q])

  const commitRecent = useCallback(
    (term: string) => {
      if (!term.trim()) return
      const next = [term, ...recent.filter((r) => r.toLowerCase() !== term.toLowerCase())].slice(0, 6)
      setRecent(next)
      try {
        localStorage.setItem("cn-recent-searches", JSON.stringify(next))
      } catch {
        /* ignore */
      }
    },
    [recent],
  )

  const go = useCallback(
    (href: string, term?: string) => {
      if (term) commitRecent(term)
      onClose()
      router.push(href)
    },
    [commitRecent, onClose, router],
  )

  // Build a flat, ordered list for keyboard navigation
  const flat: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = []

    matchedAssets.forEach((a) => {
      items.push({
        key: `asset-${a.id}`,
        group: "Assets",
        href: `/token/${a.id}`,
        label: a.name,
        render: () => (
          <div className="flex items-center gap-3">
            <TokenAvatar id={a.id} symbol={a.symbol} color={a.color} size={30} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{a.name}</span>
                <span className="text-xs text-muted-foreground">{a.symbol}</span>
                <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                  {a.category}
                </span>
              </div>
              <span className="truncate text-xs text-muted-foreground">{a.event}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold tabular-nums text-primary">
                {aiScore(a)}
              </span>
              <AISignalPill signal={aiSignal(a)} />
            </div>
          </div>
        ),
      })
    })

    matchedReports.forEach((a) => {
      items.push({
        key: `report-${a.id}`,
        group: "Research Reports",
        href: `/research`,
        label: `${a.name} Research Report`,
        render: () => (
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
              <FileText className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{a.name} — Full Research Report</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3" /> Updated 4m ago
              </div>
            </div>
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-primary">
              Open <ArrowUpRight className="size-3.5" />
            </span>
          </div>
        ),
      })
    })

    matchedIntel.forEach((i, idx) => {
      items.push({
        key: `intel-${idx}`,
        group: "Market Intelligence",
        href: `/dashboard`,
        label: i.title,
        render: () => (
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-md bg-surface text-muted-foreground ring-1 ring-border">
              <Newspaper className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{i.title}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-border">
                  {i.type}
                </span>
                {i.time}
              </div>
            </div>
          </div>
        ),
      })
    })

    matchedTopics.forEach((n) => {
      items.push({
        key: `topic-${n.name}`,
        group: "Related Topics",
        href: `/dashboard`,
        label: `${n.name} narrative`,
        render: () => (
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-md bg-surface text-muted-foreground ring-1 ring-border">
              <Layers className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{n.name}</div>
              <div className="truncate text-xs text-muted-foreground">{n.note}</div>
            </div>
            <span
              className={cn(
                "ml-auto text-xs font-medium tabular-nums",
                n.change >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {n.change >= 0 ? "+" : ""}
              {n.change}%
            </span>
          </div>
        ),
      })
    })

    return items
  }, [matchedAssets, matchedReports, matchedIntel, matchedTopics])

  // Keep active index in range
  useEffect(() => {
    setActive((a) => (flat.length ? Math.min(a, flat.length - 1) : 0))
  }, [flat.length])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [active])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
      return
    }
    if (e.nativeEvent.isComposing) return
    if (!flat.length) {
      if (e.key === "Enter" && q) {
        e.preventDefault()
        go(`/research`, query)
      }
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => (a + 1) % flat.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => (a - 1 + flat.length) % flat.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = flat[active]
      if (item) go(item.href, item.label)
    }
  }

  if (!open) return null

  // Group the flat list for rendering while tracking global indices
  const groups: { name: string; icon: React.ReactNode; items: { item: FlatItem; index: number }[] }[] = []
  const groupIcon: Record<string, React.ReactNode> = {
    Assets: <TrendingUp className="size-3.5" />,
    "Research Reports": <FileText className="size-3.5" />,
    "Market Intelligence": <Newspaper className="size-3.5" />,
    "Related Topics": <Hash className="size-3.5" />,
  }
  flat.forEach((item, index) => {
    let g = groups.find((x) => x.name === item.group)
    if (!g) {
      g = { name: item.group, icon: groupIcon[item.group], items: [] }
      groups.push(g)
    }
    g.items.push({ item, index })
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      {/* Backdrop */}
      <button
        aria-label="Close search"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-[620px] overflow-hidden rounded-2xl border border-white/10 bg-[oklch(0.19_0.02_255_/_0.92)] shadow-2xl shadow-black/50 ring-1 ring-black/40 backdrop-blur-2xl"
        onKeyDown={onKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            placeholder="Search assets, projects, narratives, reports..."
            aria-label="Search"
            className="h-14 w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden shrink-0 items-center rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
            ESC
          </kbd>
        </div>

        {/* Body */}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto overscroll-contain p-2">
          {q ? (
            groups.length ? (
              groups.map((g) => (
                <div key={g.name} className="mb-1">
                  <div className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.icon}
                    {g.name}
                  </div>
                  {g.items.map(({ item, index }) => (
                    <button
                      key={item.key}
                      data-idx={index}
                      onMouseMove={() => setActive(index)}
                      onClick={() => go(item.href, item.label)}
                      className={cn(
                        "flex w-full items-center rounded-lg px-3 py-2 text-left transition-colors",
                        active === index ? "bg-white/10" : "hover:bg-white/5",
                      )}
                    >
                      <div className="min-w-0 flex-1">{item.render()}</div>
                      {active === index && (
                        <CornerDownLeft className="ml-2 size-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-foreground">No results for &ldquo;{query}&rdquo;</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Press Enter to run a full research search instead.
                </p>
              </div>
            )
          ) : (
            <div className="p-1">
              {recent.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Clock className="size-3.5" /> Recent
                  </div>
                  {recent.map((r) => (
                    <button
                      key={r}
                      onClick={() => setQuery(r)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-white/5"
                    >
                      <Clock className="size-4 text-muted-foreground" />
                      <span className="truncate">{r}</span>
                    </button>
                  ))}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="size-3.5" /> Popular
                </div>
                <div className="flex flex-wrap gap-2 px-3 py-2">
                  {POPULAR.map((p) => (
                    <button
                      key={p}
                      onClick={() => setQuery(p)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick preview of top assets */}
              <div className="mt-1">
                <div className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Layers className="size-3.5" /> Trending assets
                </div>
                {assets.slice(0, 4).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => go(`/token/${a.id}`, a.name)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                  >
                    <TokenAvatar id={a.id} symbol={a.symbol} color={a.color} size={28} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{a.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.category} · {activityLabel(a.activity)} activity
                      </div>
                    </div>
                    <div className="ml-auto">
                      <AISignalPill signal={aiSignal(a)} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">↑</kbd>
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5">↵</kbd>
              open
            </span>
          </div>
          <span className="font-medium">CoinNavigator Search</span>
        </div>
      </div>
    </div>
  )
}
