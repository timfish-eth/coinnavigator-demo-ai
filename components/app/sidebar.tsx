"use client"

import { cn } from "@/lib/utils"
import { CoinLogo } from "@/components/primitives"
import { truncateAddress, useAuth, type Wallet } from "@/components/auth/auth-context"
import { WalletGlyph } from "@/components/auth/wallet-glyph"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  Bookmark,
  CalendarClock,
  ChevronsUpDown,
  Crown,
  LayoutDashboard,
  LibraryBig,
  LineChart,
  LogOut,
  Settings,
  Sparkles,
  Wallet as WalletIcon,
} from "lucide-react"

const navGroups = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Market", href: "/market", icon: LineChart },
      { label: "Research", href: "/research", icon: Sparkles },
    ],
  },
  {
    title: "Personal",
    items: [
      { label: "Library", href: "/library", icon: LibraryBig },
      { label: "Watchlist", href: "/watchlist", icon: Bookmark },
    ],
  },
  {
    title: "Account",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { wallet, isConnected, openConnect } = useAuth()
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      {/* Logo */}
      <div className="flex h-[72px] shrink-0 items-center px-5">
        <Link href="/">
          <CoinLogo />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </p>
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href === "/research" && pathname.startsWith("/research"))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/15 text-foreground ring-1 ring-primary/30 shadow-[0_0_20px_-6px_var(--color-primary)]"
                      : "text-sidebar-foreground hover:bg-white/5 hover:text-foreground",
                  )}
                >
                  <item.icon className={cn("size-[18px]", active ? "text-primary" : "text-sidebar-foreground group-hover:text-foreground")} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom wallet section — always fixed at the bottom */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        {isConnected && wallet ? (
          <SidebarWallet wallet={wallet} />
        ) : (
          <button
            onClick={() => openConnect("generic")}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <WalletIcon className="size-4" />
            Connect Wallet
          </button>
        )}
      </div>
    </aside>
  )
}

function SidebarWallet({ wallet }: { wallet: Wallet }) {
  const { disconnect, openUpgrade, isPro, membershipExpiryLabel } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const showExpiry = isPro && membershipExpiryLabel !== "Not active"

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      {open && (
        <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 origin-bottom animate-in fade-in slide-in-from-bottom-1 overflow-hidden rounded-xl border border-border bg-card shadow-[0_18px_60px_-12px_rgba(0,0,0,0.6)] duration-150">
          <div className="border-b border-border px-4 py-3">
            <p className="font-mono text-sm font-medium text-foreground">{truncateAddress(wallet.address)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{wallet.network} Network</p>
            {showExpiry && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-accent">
                <CalendarClock className="size-3.5" />
                Expires {membershipExpiryLabel}
              </p>
            )}
          </div>
          <nav className="py-1.5">
            <Link
              href="/membership"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/90 transition-colors hover:bg-white/5"
            >
              <Crown className="size-4 text-muted-foreground" />
              Membership
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/90 transition-colors hover:bg-white/5"
            >
              <Settings className="size-4 text-muted-foreground" />
              Settings
            </Link>
          </nav>
          <div className="border-t border-border py-1.5">
            <button
              onClick={() => {
                setOpen(false)
                disconnect()
                router.push("/dashboard")
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive/90 transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Disconnect
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Wallet menu"
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
      >
        <WalletGlyph id={wallet.walletId} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-medium text-foreground">{truncateAddress(wallet.address)}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            {isPro && <Crown className="size-3 text-accent" />}
            {wallet.membership} Member
          </p>
        </div>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </button>
      {!isPro && (
        <button
          onClick={openUpgrade}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent/15 px-3 py-2 text-xs font-semibold text-accent ring-1 ring-accent/25 transition-colors hover:bg-accent/25"
        >
          <Crown className="size-3.5" />
          Upgrade Research Pass
        </button>
      )}
    </div>
  )
}
