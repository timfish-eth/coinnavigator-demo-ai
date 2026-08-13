import { mkdir, readFile, rename, writeFile } from "fs/promises"
import path from "path"

import type { Asset } from "@/lib/data"
import type { MarketNewsItem } from "@/lib/market-data"

const NEWS_STORAGE_ROOT = path.join(process.cwd(), "storage", "news")
const TOKEN_NEWS_LIMIT = 8
const REQUEST_TIMEOUT_MS = 8_000

type NewsState = {
  locks: Map<string, Promise<unknown>>
  memory: Map<string, MarketNewsItem[]>
}

type NewsDataArticle = {
  title?: string
  link?: string
  source_id?: string
  source_name?: string
  pubDate?: string
  pubDateTZ?: string
  coin?: string[]
}

type NewsDataResponse = {
  results?: NewsDataArticle[]
}

type GdeltArticle = {
  title?: string
  url?: string
  domain?: string
  seendate?: string
  sourcecountry?: string
}

type GdeltResponse = {
  articles?: GdeltArticle[]
}

const state = globalThis as typeof globalThis & {
  __coinnavigatorTokenNews?: NewsState
}

function newsState(): NewsState {
  state.__coinnavigatorTokenNews ??= {
    locks: new Map(),
    memory: new Map(),
  }
  return state.__coinnavigatorTokenNews
}

function dateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function safeFileKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, "-")
}

function newsKey(asset: Asset, day = dateKey()): string {
  return `${asset.id}:${day}`
}

function newsPath(key: string): string {
  return path.join(NEWS_STORAGE_ROOT, `${safeFileKey(key)}.json`)
}

async function writeFileAtomic(filePath: string, data: string): Promise<void> {
  const dir = path.dirname(filePath)
  await mkdir(/* turbopackIgnore: true */ dir, { recursive: true })
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(/* turbopackIgnore: true */ tempPath, data)
  await rename(/* turbopackIgnore: true */ tempPath, /* turbopackIgnore: true */ filePath)
}

async function withNewsLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const store = newsState()
  const existing = store.locks.get(key) as Promise<T> | undefined
  if (existing) return existing

  const pending = task().finally(() => {
    store.locks.delete(key)
  })
  store.locks.set(key, pending)
  return pending
}

async function requestJson<T>(url: URL): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    })
    if (!response.ok) throw new Error(`News API responded ${response.status}`)
    return await response.json() as T
  } finally {
    clearTimeout(timeout)
  }
}

async function requestText(url: URL): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml,text/xml,text/plain",
      },
      next: { revalidate: 300 },
    })
    if (!response.ok) throw new Error(`News feed responded ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeNews(items: MarketNewsItem[], asset: Asset): MarketNewsItem[] {
  const seen = new Set<string>()
  return items
    .filter((item) => item.title.trim())
    .filter((item) => {
      const key = `${item.title.trim().toLowerCase()}|${item.url ?? ""}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime())
    .slice(0, TOKEN_NEWS_LIMIT)
    .map((item) => ({
      ...item,
      relatedSymbols: item.relatedSymbols.length ? item.relatedSymbols : [asset.symbol],
    }))
}

function parseGdeltDate(value?: string): string | undefined {
  if (!value || !/^\d{8}T\d{6}Z$/.test(value)) return value
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function tagValue(item: string, tag: string): string | undefined {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))
  return match?.[1] ? decodeXml(match[1]) : undefined
}

async function readStoredTokenNews(key: string): Promise<MarketNewsItem[] | null> {
  try {
    const raw = await readFile(/* turbopackIgnore: true */ newsPath(key), "utf8")
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.filter((item): item is MarketNewsItem => {
      return Boolean(item && typeof item === "object" && typeof (item as MarketNewsItem).title === "string")
    })
  } catch {
    return null
  }
}

async function writeStoredTokenNews(key: string, news: MarketNewsItem[]): Promise<void> {
  await writeFileAtomic(newsPath(key), JSON.stringify(news, null, 2))
}

async function fetchNewsDataTokenNews(asset: Asset): Promise<MarketNewsItem[]> {
  const apiKey = process.env.NEWSDATA_API_KEY
  if (!apiKey) return []

  const url = new URL("https://newsdata.io/api/1/crypto")
  url.searchParams.set("apikey", apiKey)
  url.searchParams.set("coin", asset.symbol.toLowerCase())
  url.searchParams.set("language", "en")
  url.searchParams.set("timeframe", "24")

  const payload = await requestJson<NewsDataResponse>(url)
  return normalizeNews((payload.results ?? []).map((item) => ({
    title: item.title ?? "Crypto market news",
    source: item.source_name ?? item.source_id ?? "NewsData.io",
    url: item.link,
    publishedAt: item.pubDate,
    relatedSymbols: item.coin?.length ? item.coin.map((coin) => coin.toUpperCase()) : [asset.symbol],
  })), asset)
}

async function fetchGdeltTokenNews(asset: Asset): Promise<MarketNewsItem[]> {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc")
  const query = `${asset.name} crypto`
  url.searchParams.set("query", query)
  url.searchParams.set("mode", "ArtList")
  url.searchParams.set("format", "json")
  url.searchParams.set("maxrecords", String(TOKEN_NEWS_LIMIT))
  url.searchParams.set("sort", "DateDesc")
  url.searchParams.set("timespan", "24h")

  const payload = await requestJson<GdeltResponse>(url)
  return normalizeNews((payload.articles ?? []).map((item) => ({
    title: item.title ?? "Crypto market news",
    source: item.domain ?? "GDELT",
    url: item.url,
    publishedAt: parseGdeltDate(item.seendate),
    relatedSymbols: [asset.symbol],
  })), asset)
}

async function fetchGoogleNewsTokenNews(asset: Asset): Promise<MarketNewsItem[]> {
  const url = new URL("https://news.google.com/rss/search")
  url.searchParams.set("q", `${asset.name} ${asset.symbol} crypto when:1d`)
  url.searchParams.set("hl", "en-US")
  url.searchParams.set("gl", "US")
  url.searchParams.set("ceid", "US:en")

  const xml = await requestText(url)
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map((match) => match[1] ?? "")
  return normalizeNews(items.map((item) => {
    const source = tagValue(item, "source")
    const publishedAt = tagValue(item, "pubDate")
    return {
      title: tagValue(item, "title") ?? "Crypto market news",
      source: source ?? "Google News",
      url: tagValue(item, "link"),
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
      relatedSymbols: [asset.symbol],
    }
  }), asset)
}

export async function getDailyTokenNews(asset: Asset): Promise<MarketNewsItem[]> {
  const key = newsKey(asset)
  const store = newsState()
  const cached = store.memory.get(key)
  if (cached) return cached

  const stored = await readStoredTokenNews(key)
  if (stored) {
    store.memory.set(key, stored)
    return stored
  }

  return withNewsLock(key, async () => {
    const cachedAfterWait = store.memory.get(key)
    if (cachedAfterWait) return cachedAfterWait

    const storedAfterWait = await readStoredTokenNews(key)
    if (storedAfterWait) {
      store.memory.set(key, storedAfterWait)
      return storedAfterWait
    }

    let news: MarketNewsItem[] = []
    try {
      news = await fetchNewsDataTokenNews(asset)
    } catch {
      news = []
    }

    if (!news.length) {
      try {
        news = await fetchGdeltTokenNews(asset)
      } catch {
        news = []
      }
    }

    if (!news.length) {
      try {
        news = await fetchGoogleNewsTokenNews(asset)
      } catch {
        news = []
      }
    }

    if (news.length) {
      store.memory.set(key, news)
      await writeStoredTokenNews(key, news)
    }
    return news
  })
}
