import { cn } from "@/lib/utils"

export function Panel({
  children,
  className,
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={cn("rounded-2xl border border-border bg-card", className)}>{children}</section>
  )
}

export function PanelHeader({
  title,
  icon: Icon,
  action,
  className,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between border-b border-border px-5 py-4", className)}>
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="size-4 text-primary" /> : null}
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}
