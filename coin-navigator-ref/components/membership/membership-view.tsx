"use client"

import { Panel } from "@/components/app/panel"
import { RESEARCH_PASS, useAuth } from "@/components/auth/auth-context"
import { MembershipPlans } from "@/components/marketing/membership-plans"
import { ArrowRight, FileText, LibraryBig, ShieldCheck, Sparkles } from "lucide-react"

const flow = [
  { icon: Sparkles, label: "Run unlimited AI research" },
  { icon: FileText, label: "Generate advanced reports" },
  { icon: LibraryBig, label: "Build a full research library" },
]

export function MembershipView() {
  const { isPro } = useAuth()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Membership</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your plan and pay on-chain with USDT on {RESEARCH_PASS.network}.
        </p>
      </div>

      <MembershipPlans variant="app" />

      {!isPro && (
        <Panel className="overflow-hidden">
          <div className="relative flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="absolute -left-10 -top-10 size-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                With Research Pass you can
              </p>
              <ul className="mt-3 space-y-2">
                {flow.map((f) => (
                  <li key={f.label} className="flex items-center gap-2.5 text-sm text-foreground/90">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                      <f.icon className="size-3.5 text-primary" />
                    </span>
                    {f.label}
                    <ArrowRight className="ml-auto hidden size-3.5 text-muted-foreground sm:block" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        Payments are simulated on-chain for demo purposes. No real funds are moved.
      </p>
    </div>
  )
}
