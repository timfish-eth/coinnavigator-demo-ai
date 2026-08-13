import { cn } from "@/lib/utils"
import { TrendingDown, TrendingUp } from "lucide-react"

export function Sparkline({
  data,
  positive,
  className,
  width = 96,
  height = 32,
}: {
  data: number[]
  positive: boolean
  className?: string
  width?: number
  height?: number
}) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data.map((d, i) => {
    const x = i * step
    const y = height - ((d - min) / range) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const stroke = positive ? "var(--color-success)" : "var(--color-destructive)"
  const gradId = `spark-${positive ? "up" : "down"}-${Math.round(data[0] * 100)}`
  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,${height} ${points.join(" ")} ${width},${height}`}
        fill={`url(#${gradId})`}
        stroke="none"
      />
      <polyline points={points.join(" ")} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChangeBadge({ value, className }: { value: number; className?: string }) {
  const positive = value >= 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
        positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
        className,
      )}
    >
      {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  )
}

export function RiskPill({ level }: { level: "Low" | "Medium" | "High" }) {
  const map = {
    Low: "bg-success/10 text-success",
    Medium: "bg-warning/10 text-warning",
    High: "bg-destructive/10 text-destructive",
  }
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", map[level])}>
      {level}
    </span>
  )
}

export function SignalPill({ signal }: { signal: "Bullish" | "Neutral" | "Bearish" }) {
  const map = {
    Bullish: "bg-success/10 text-success ring-success/20",
    Neutral: "bg-muted-foreground/10 text-muted-foreground ring-muted-foreground/20",
    Bearish: "bg-destructive/10 text-destructive ring-destructive/20",
  }
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1", map[signal])}>
      {signal}
    </span>
  )
}

export function AISignalPill({ signal }: { signal: "Positive" | "Neutral" | "Watch" }) {
  const map = {
    Positive: { cls: "bg-success/10 text-success ring-success/20", dot: "bg-success" },
    Neutral: { cls: "bg-muted-foreground/10 text-muted-foreground ring-muted-foreground/20", dot: "bg-muted-foreground" },
    Watch: { cls: "bg-warning/10 text-warning ring-warning/20", dot: "bg-warning" },
  }
  const s = map[signal]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1", s.cls)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {signal}
    </span>
  )
}

export function TokenAvatar({
  id,
  symbol,
  color,
  size = 32,
}: {
  id?: string
  symbol: string
  color: string
  size?: number
}) {
  if (id) {
    return (
      <span
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-border"
        style={{ width: size, height: size }}
      >
        <img
          src={`/tokens/${id}.png`}
          alt={`${symbol} logo`}
          width={size}
          height={size}
          className="size-full object-cover"
          loading="lazy"
        />
      </span>
    )
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: `${color}22`,
        border: `1px solid ${color}55`,
        color,
        fontSize: size * 0.34,
      }}
      aria-hidden
    >
      {symbol.slice(0, 3)}
    </div>
  )
}

export function CoinLogo({ className, size = 30 }: { className?: string; size?: number }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative overflow-hidden rounded-lg" style={{ width: size, height: size }} aria-hidden>
        {/* The source logo is a wide image (icon + wordmark); we clip to the leftmost square to show just the gradient mark. */}
        <img
          src="/coinnavigator-logo.png"
          alt=""
          className="max-w-none"
          style={{ height: size, width: "auto", objectFit: "cover", objectPosition: "left center" }}
        />
      </div>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">CoinNavigator</span>
    </div>
  )
}
