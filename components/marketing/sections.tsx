import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DashboardMock } from "@/components/marketing/dashboard-mock"
import { MembershipPlans } from "@/components/marketing/membership-plans"
import { CoinLogo } from "@/components/primitives"
import Link from "next/link"
import { Compass, FileText, Gauge, Search } from "lucide-react"

/* ---------------------------------- Hero --------------------------------- */
export function Hero() {
  return (
    <section id="platform" className="relative overflow-hidden">
      <div className="grid-fade pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="absolute -top-40 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 lg:px-6 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-accent" />
              AI-powered Web3 Research
            </span>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              AI-powered Web3 Research Terminal
            </h1>
            <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground lg:text-lg">
              Research crypto projects, discover market narratives, and generate AI-powered reports with your wallet.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                Launch App
              </Link>
            </div>
          </div>
          <div className="relative">
            <DashboardMock />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ----------------------------- How It Works ------------------------------ */
const steps = [
  {
    icon: Compass,
    title: "Discover Trends",
    desc: "Find emerging crypto narratives and market opportunities.",
  },
  {
    icon: Search,
    title: "Research Projects",
    desc: "Understand crypto assets with AI-powered analysis.",
  },
  {
    icon: FileText,
    title: "Generate Reports",
    desc: "Create structured research reports instantly.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          How CoinNavigator Works
        </h2>
        <p className="mt-4 text-pretty text-muted-foreground">
          A simple workflow to go from market discovery to professional research.
        </p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="glass-card group rounded-2xl p-6 transition-colors hover:border-primary/40">
            <div className="flex items-center justify-between">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                <s.icon className="size-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground/60">0{i + 1}</span>
            </div>
            <h3 className="mt-5 text-base font-semibold text-foreground">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------ Membership -------------------------------- */
export function Membership() {
  return (
    <section id="membership" className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-accent" />
          Research Membership
        </span>
        <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Unlock the full research terminal
        </h2>
        <p className="mt-4 text-pretty text-muted-foreground">
          Start free, then upgrade to a Research Pass — paid on-chain with USDT — for unlimited AI research.
        </p>
      </div>
      <div className="mx-auto mt-12 max-w-3xl">
        <MembershipPlans />
      </div>
    </section>
  )
}

/* ---------------------------------- CTA ----------------------------------- */
export function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-16 text-center">
        <div className="absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[110px]" />
        <div className="relative">
          <Gauge className="mx-auto size-8 text-accent" />
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Understand crypto beyond the price.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
            Connect your wallet to research projects and generate AI reports in one terminal.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              Launch App
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------- Footer --------------------------------- */
const footerCols = [
  {
    title: "Product",
    links: [
      { label: "Market", href: "/market" },
      { label: "Research", href: "/research" },
      { label: "Library", href: "/library" },
      { label: "Watchlist", href: "/watchlist" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "X", href: "https://x.com/CoinNavigator1", external: true },
      { label: "Telegram", href: "https://t.me/CoinNavigator1", external: true },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(2,1fr)]">
          <div>
            <CoinLogo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              AI-powered crypto research for serious investors and researchers.
            </p>
          </div>
          {footerCols.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-foreground">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) =>
                  "external" in l && l.external ? (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} CoinNavigator. All rights reserved.</p>
          <p>Research intelligence, not financial advice.</p>
        </div>
      </div>
    </footer>
  )
}
