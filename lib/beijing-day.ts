const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

export const BEIJING_TIME_ZONE = "Asia/Shanghai"

export function beijingDateKey(date = new Date()): string {
  return new Date(date.getTime() + BEIJING_OFFSET_MS).toISOString().slice(0, 10)
}

export function nextBeijingRefreshAt(date = new Date()): Date {
  const [year, month, day] = beijingDateKey(date).split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1) - BEIJING_OFFSET_MS)
}

export function cacheExpiresAtNextBeijingRefresh(ttlMs: number, date = new Date()): number {
  return Math.min(date.getTime() + ttlMs, nextBeijingRefreshAt(date).getTime())
}

export function formatBeijingRefreshTime(date = nextBeijingRefreshAt()): string {
  return `${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
    timeZone: BEIJING_TIME_ZONE,
  }).format(date)} Beijing Time`
}
