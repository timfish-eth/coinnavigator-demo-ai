import { assets as fallbackAssets, type Asset, type Trend } from "@/lib/data"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

type MarketDataSource = "CoinMarketCap" | "CoinGecko" | "Demo"

export type TopAssetsResult = {
  assets: Asset[]
  source: MarketDataSource
  updatedAt: string
}

export type MarketMetric = {
  label: string
  value: string
  change?: number
}

export type MarketNewsItem = {
  title: string
  source: string
  url?: string
  publishedAt?: string
  relatedSymbols: string[]
}

export type MarketResearchReport = {
  source: MarketDataSource
  updatedAt: string
  metrics: {
    btcPrice: MarketMetric
    ethPrice: MarketMetric
    totalMarketCap: MarketMetric
    volume24h: MarketMetric
    btcDominance: MarketMetric
  }
  thesis: string
  summary: string
  keyFindings: string[]
  risks: string[]
  news: MarketNewsItem[]
}

type CoinGeckoMarket = {
  id: string
  symbol: string
  name: string
  image?: string
  current_price?: number
  market_cap?: number
  market_cap_rank?: number
  total_volume?: number
  price_change_percentage_24h?: number
}

type CoinGeckoSearchCoin = {
  id: string
  name: string
  symbol: string
  market_cap_rank?: number
  thumb?: string
  large?: string
}

type CoinGeckoSearch = {
  coins?: CoinGeckoSearchCoin[]
}

type CoinMarketCapListing = {
  id: number
  name: string
  symbol: string
  slug: string
  cmc_rank?: number
  tags?: string[]
  quote?: Record<string, {
    price?: number
    volume_24h?: number
    percent_change_24h?: number
    market_cap?: number
  }> | Array<{
    symbol?: string
    price?: number
    volume_24h?: number
    percent_change_24h?: number
    market_cap?: number
  }>
}

type CoinGeckoGlobal = {
  data?: {
    total_market_cap?: Record<string, number>
    total_volume?: Record<string, number>
    market_cap_change_percentage_24h_usd?: number
    market_cap_percentage?: Record<string, number>
  }
}

type CoinGeckoNews = {
  title: string
  url?: string
  source_name?: string
  posted_at?: string
  related_coin_ids?: string[]
}

type CoinMarketCapContent = {
  data?: Array<{
    title?: string
    source_name?: string
    source_url?: string
    released_at?: string
    created_at?: string
    assets?: Array<{ symbol?: string; slug?: string; name?: string }>
  }>
}

type CryptoPanicPost = {
  title?: string
  url?: string
  published_at?: string
  source?: {
    title?: string
  }
  currencies?: Array<{
    code?: string
    slug?: string
    title?: string
  }>
}

type CryptoPanicResponse = {
  results?: CryptoPanicPost[]
}

const TOP_ASSET_LIMIT = 100
const SEARCH_ASSET_LIMIT = 20
const cacheTtlMs = 60_000
let cachedTopAssets: { expiresAt: number; data: TopAssetsResult } | undefined
const cachedSearchAssets = new Map<string, { expiresAt: number; data: TopAssetsResult }>()
const execFileAsync = promisify(execFile)

async function requestJson<T>(url: URL, headers: Record<string, string> = {}): Promise<T> {
  try {
    const response = await fetch(url, {
      headers,
      next: { revalidate: 60 },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json() as T
  } catch (fetchError) {
    const args = ["-sS", "-L", url.toString()]
    for (const [key, value] of Object.entries(headers)) {
      args.push("-H", `${key}: ${value}`)
    }

    try {
      const { stdout } = await execFileAsync("curl.exe", args, {
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
      })
      return JSON.parse(stdout) as T
    } catch (curlError) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Market data request failed", {
          fetch: fetchError instanceof Error ? fetchError.message : String(fetchError),
          curl: curlError instanceof Error ? curlError.message : String(curlError),
        })
      }
      throw fetchError
    }
  }
}

function compactCurrency(value?: number): string {
  if (!Number.isFinite(value) || value === undefined) return "-"
  const abs = Math.abs(value)
  const units = [
    { suffix: "T", value: 1_000_000_000_000 },
    { suffix: "B", value: 1_000_000_000 },
    { suffix: "M", value: 1_000_000 },
    { suffix: "K", value: 1_000 },
  ]
  const unit = units.find((u) => abs >= u.value)
  if (!unit) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  return `$${(value / unit.value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit.suffix}`
}

function compactPercent(value?: number): string {
  if (!Number.isFinite(value) || value === undefined) return "-"
  return `${value.toFixed(2)}%`
}

function stableColor(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 72% 56%)`
}

function makeTrend(seed: number, change24h: number): Trend {
  const points: number[] = []
  let value = 50
  const direction = change24h >= 0 ? 1 : -1
  for (let i = 0; i < 24; i += 1) {
    const noise = Math.sin(seed + i * 0.65) * 7 + Math.cos(seed * 1.7 + i) * 3
    value += noise + direction * 1.2
    points.push(Math.max(8, Math.min(96, value)))
  }
  return points
}

function categoryFor(id: string, symbol: string, tags: string[] = []): string {
  const key = `${id} ${symbol} ${tags.join(" ")}`.toLowerCase()
  if (key.includes("ai") || key.includes("artificial-intelligence") || ["tao", "fet", "render", "rndr"].includes(symbol.toLowerCase())) return "AI"
  if (key.includes("layer-2") || key.includes("rollup") || ["arb", "op", "strk", "mnt"].includes(symbol.toLowerCase())) return "Layer 2"
  if (key.includes("oracle") || ["link", "pyth"].includes(symbol.toLowerCase())) return "Oracle"
  if (key.includes("real-world-assets") || key.includes("rwa") || ["ondo", "pendle"].includes(symbol.toLowerCase())) return "RWA"
  if (key.includes("depin") || ["hnt", "akt"].includes(symbol.toLowerCase())) return "DePIN"
  if (key.includes("defi") || key.includes("dex") || ["crv", "uni", "aave", "mkr", "comp", "sushi"].includes(symbol.toLowerCase())) return "DeFi"
  if (["btc", "eth", "sol", "bnb", "ada", "avax", "dot", "ton", "near", "sui"].includes(symbol.toLowerCase())) return "Layer 1"
  if (key.includes("stablecoin") || ["usdt", "usdc", "dai"].includes(symbol.toLowerCase())) return "Stablecoin"
  return "Market"
}

function signalFor(change24h: number): Asset["signal"] {
  if (change24h >= 1.5) return "Bullish"
  if (change24h <= -1.5) return "Bearish"
  return "Neutral"
}

function riskFor(rank: number, change24h: number): Asset["risk"] {
  if (rank <= 10 && Math.abs(change24h) < 8) return "Low"
  if (rank <= 50 && Math.abs(change24h) < 15) return "Medium"
  return "High"
}

function activityFor(rank: number, volume?: number, marketCap?: number): number {
  const rankScore = Math.max(0, 100 - rank)
  const liquidityRatio = marketCap && volume ? Math.min(30, (volume / marketCap) * 300) : 12
  return Math.max(35, Math.min(96, Math.round(rankScore * 0.65 + liquidityRatio + 18)))
}

function quoteUsd(listing: CoinMarketCapListing) {
  if (!listing.quote) return undefined
  if (Array.isArray(listing.quote)) {
    return listing.quote.find((q) => q.symbol === "USD") ?? listing.quote[0]
  }
  return listing.quote.USD
}

function mapAsset(input: {
  id: string
  symbol: string
  name: string
  rank?: number
  price?: number
  marketCap?: number
  volume?: number
  change24h?: number
  imageUrl?: string
  tags?: string[]
  source: MarketDataSource
}): Asset {
  const rank = input.rank ?? 999
  const change24h = input.change24h ?? 0
  const symbol = input.symbol.toUpperCase()
  const seed = input.id.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0)
  const category = categoryFor(input.id, symbol, input.tags)

  return {
    id: input.id,
    name: input.name,
    symbol,
    category,
    price: input.price ?? 0,
    change24h,
    marketCap: compactCurrency(input.marketCap),
    volume: compactCurrency(input.volume),
    rank,
    signal: signalFor(change24h),
    risk: riskFor(rank, change24h),
    activity: activityFor(rank, input.volume, input.marketCap),
    event: `${input.name} is ranked #${rank} by market capitalization with ${compactCurrency(input.volume)} in 24h volume.`,
    trend: makeTrend(seed, change24h),
    color: stableColor(input.id),
    imageUrl: input.imageUrl,
    source: input.source,
  }
}

async function fetchCoinMarketCapTopAssets(): Promise<TopAssetsResult | undefined> {
  const apiKey = process.env.COINMARKETCAP_API_KEY ?? process.env.CMC_API_KEY
  if (!apiKey) return undefined

  const url = new URL("https://pro-api.coinmarketcap.com/v3/cryptocurrency/listings/latest")
  url.searchParams.set("start", "1")
  url.searchParams.set("limit", String(TOP_ASSET_LIMIT))
  url.searchParams.set("convert", "USD")
  url.searchParams.set("sort", "market_cap")

  const payload = await requestJson<{ data?: CoinMarketCapListing[] }>(url, { "X-CMC_PRO_API_KEY": apiKey })
  const rows = payload.data ?? []
  if (!rows.length) throw new Error("CoinMarketCap returned no listings")

  return {
    assets: rows.slice(0, TOP_ASSET_LIMIT).map((row) => {
      const quote = quoteUsd(row)
      return mapAsset({
        id: row.slug,
        symbol: row.symbol,
        name: row.name,
        rank: row.cmc_rank,
        price: quote?.price,
        marketCap: quote?.market_cap,
        volume: quote?.volume_24h,
        change24h: quote?.percent_change_24h,
        tags: row.tags,
        source: "CoinMarketCap",
      })
    }),
    source: "CoinMarketCap",
    updatedAt: new Date().toISOString(),
  }
}

async function fetchCoinGeckoTopAssets(): Promise<TopAssetsResult> {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets")
  url.searchParams.set("vs_currency", "usd")
  url.searchParams.set("order", "market_cap_desc")
  url.searchParams.set("per_page", String(TOP_ASSET_LIMIT))
  url.searchParams.set("page", "1")
  url.searchParams.set("sparkline", "false")
  url.searchParams.set("price_change_percentage", "24h")

  const headers: Record<string, string> = {}
  const apiKey = process.env.COINGECKO_API_KEY
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey

  const rows = await requestJson<CoinGeckoMarket[]>(url, headers)
  if (!rows.length) throw new Error("CoinGecko returned no markets")

  return {
    assets: rows.slice(0, TOP_ASSET_LIMIT).map((row) =>
      mapAsset({
        id: row.id,
        symbol: row.symbol,
        name: row.name,
        rank: row.market_cap_rank,
        price: row.current_price,
        marketCap: row.market_cap,
        volume: row.total_volume,
        change24h: row.price_change_percentage_24h,
        imageUrl: row.image,
        source: "CoinGecko",
      }),
    ),
    source: "CoinGecko",
    updatedAt: new Date().toISOString(),
  }
}

async function fetchCoinGeckoMarketsByIds(ids: string[]): Promise<Asset[]> {
  if (!ids.length) return []

  const url = new URL("https://api.coingecko.com/api/v3/coins/markets")
  url.searchParams.set("vs_currency", "usd")
  url.searchParams.set("ids", ids.join(","))
  url.searchParams.set("order", "market_cap_desc")
  url.searchParams.set("per_page", String(Math.min(SEARCH_ASSET_LIMIT, ids.length)))
  url.searchParams.set("page", "1")
  url.searchParams.set("sparkline", "false")
  url.searchParams.set("price_change_percentage", "24h")

  const headers: Record<string, string> = {}
  const apiKey = process.env.COINGECKO_API_KEY
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey

  const rows = await requestJson<CoinGeckoMarket[]>(url, headers)
  return rows.map((row) =>
    mapAsset({
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      rank: row.market_cap_rank,
      price: row.current_price,
      marketCap: row.market_cap,
      volume: row.total_volume,
      change24h: row.price_change_percentage_24h,
      imageUrl: row.image,
      source: "CoinGecko",
    }),
  )
}

async function fetchCoinGeckoMarketsBySymbol(symbol: string): Promise<Asset[]> {
  const normalizedSymbol = symbol.trim().toLowerCase()
  if (!normalizedSymbol || !/^[a-z0-9]+$/.test(normalizedSymbol)) return []

  const url = new URL("https://api.coingecko.com/api/v3/coins/markets")
  url.searchParams.set("vs_currency", "usd")
  url.searchParams.set("symbols", normalizedSymbol)
  url.searchParams.set("include_tokens", "all")
  url.searchParams.set("order", "market_cap_desc")
  url.searchParams.set("per_page", "50")
  url.searchParams.set("page", "1")
  url.searchParams.set("sparkline", "false")
  url.searchParams.set("price_change_percentage", "24h")

  const headers: Record<string, string> = {}
  const apiKey = process.env.COINGECKO_API_KEY
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey

  const rows = await requestJson<CoinGeckoMarket[]>(url, headers)
  return rows.map((row) =>
    mapAsset({
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      rank: row.market_cap_rank,
      price: row.current_price,
      marketCap: row.market_cap,
      volume: row.total_volume,
      change24h: row.price_change_percentage_24h,
      imageUrl: row.image,
      source: "CoinGecko",
    }),
  )
}

async function fetchCoinGeckoSearchAssets(query: string): Promise<TopAssetsResult> {
  const url = new URL("https://api.coingecko.com/api/v3/search")
  url.searchParams.set("query", query)

  const headers: Record<string, string> = {}
  const apiKey = process.env.COINGECKO_API_KEY
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey

  const payload = await requestJson<CoinGeckoSearch>(url, headers)
  const coins = (payload.coins ?? [])
    .filter((coin) => coin.id && coin.name && coin.symbol)
    .sort((a, b) => (a.market_cap_rank ?? Number.MAX_SAFE_INTEGER) - (b.market_cap_rank ?? Number.MAX_SAFE_INTEGER))
    .slice(0, SEARCH_ASSET_LIMIT)

  const marketAssets = await fetchCoinGeckoMarketsByIds(coins.map((coin) => coin.id)).catch(() => [])
  const byId = new Map(marketAssets.map((asset) => [asset.id, asset]))
  const assets = coins.map((coin) => {
    const marketAsset = byId.get(coin.id)
    if (marketAsset) return marketAsset

    return mapAsset({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      rank: coin.market_cap_rank,
      imageUrl: coin.large ?? coin.thumb,
      source: "CoinGecko",
    })
  })

  return {
    assets,
    source: "CoinGecko",
    updatedAt: new Date().toISOString(),
  }
}

async function fetchCoinGeckoGlobal() {
  const url = new URL("https://api.coingecko.com/api/v3/global")
  return requestJson<CoinGeckoGlobal>(url)
}

async function fetchMarketNews(assetIds: string[]): Promise<MarketNewsItem[]> {
  const cmcKey = process.env.COINMARKETCAP_API_KEY ?? process.env.CMC_API_KEY
  if (cmcKey) {
    try {
      const url = new URL("https://pro-api.coinmarketcap.com/v1/content/latest")
      url.searchParams.set("content_type", "news")
      url.searchParams.set("language", "en")
      const payload = await requestJson<CoinMarketCapContent>(url, { "X-CMC_PRO_API_KEY": cmcKey })
      const rows = payload.data ?? []
      return rows.slice(0, 6).map((item) => ({
        title: item.title ?? "Market news update",
        source: item.source_name ?? "CoinMarketCap",
        url: item.source_url,
        publishedAt: item.released_at ?? item.created_at,
        relatedSymbols: item.assets?.map((asset) => asset.symbol ?? asset.slug ?? asset.name ?? "").filter(Boolean).slice(0, 4) ?? [],
      }))
    } catch {
      // Fall through to CoinGecko news or synthetic market events.
    }
  }

  const geckoKey = process.env.COINGECKO_API_KEY
  if (geckoKey) {
    try {
      const url = new URL("https://pro-api.coingecko.com/api/v3/news")
      url.searchParams.set("per_page", "6")
      url.searchParams.set("type", "news")
      const payload = await requestJson<CoinGeckoNews[]>(url, { "x-cg-pro-api-key": geckoKey })
      return payload.map((item) => ({
        title: item.title,
        source: item.source_name ?? "CoinGecko",
        url: item.url,
        publishedAt: item.posted_at,
        relatedSymbols: (item.related_coin_ids ?? []).filter((id) => assetIds.includes(id)).slice(0, 4),
      }))
    } catch {
      // Fall through to synthetic market events.
    }
  }

  const cryptoPanicKey = process.env.CRYPTOPANIC_API_KEY
  if (cryptoPanicKey) {
    try {
      const url = new URL("https://cryptopanic.com/api/v1/posts/")
      url.searchParams.set("auth_token", cryptoPanicKey)
      url.searchParams.set("public", "true")
      url.searchParams.set("kind", "news")
      const payload = await requestJson<CryptoPanicResponse>(url)
      return (payload.results ?? []).slice(0, 8).map((item) => ({
        title: item.title ?? "Crypto market news",
        source: item.source?.title ?? "CryptoPanic",
        url: item.url,
        publishedAt: item.published_at,
        relatedSymbols:
          item.currencies
            ?.map((currency) => currency.code ?? currency.slug ?? currency.title ?? "")
            .filter(Boolean)
            .slice(0, 4) ?? [],
      }))
    } catch {
      // Fall through to synthetic market events.
    }
  }

  return []
}

function syntheticNews(btc: Asset, eth: Asset, globalChange?: number, btcDominance?: number): MarketNewsItem[] {
  return [
    {
      title: `Bitcoin trades at ${compactCurrency(btc.price)} with ${compactPercent(btc.change24h)} 24h movement`,
      source: btc.source ?? "Market data",
      relatedSymbols: ["BTC"],
    },
    {
      title: `Ethereum trades at ${compactCurrency(eth.price)} with ${compactPercent(eth.change24h)} 24h movement`,
      source: eth.source ?? "Market data",
      relatedSymbols: ["ETH"],
    },
    {
      title: `Total crypto market cap changed ${compactPercent(globalChange)} while BTC dominance sits near ${compactPercent(btcDominance)}`,
      source: "Global market metrics",
      relatedSymbols: ["BTC", "ETH"],
    },
  ]
}

export async function getMarketResearchReport(): Promise<MarketResearchReport> {
  const [topAssets, globalPayload] = await Promise.all([
    getTopAssets(),
    fetchCoinGeckoGlobal().catch(() => undefined),
  ])
  const btc = topAssets.assets.find((asset) => asset.id === "bitcoin" || asset.symbol === "BTC") ?? topAssets.assets[0]
  const eth = topAssets.assets.find((asset) => asset.id === "ethereum" || asset.symbol === "ETH") ?? topAssets.assets[1] ?? btc
  const global = globalPayload?.data
  const totalMarketCap = global?.total_market_cap?.usd
  const volume24h = global?.total_volume?.usd
  const marketCapChange = global?.market_cap_change_percentage_24h_usd
  const btcDominance = global?.market_cap_percentage?.btc
  const rawNews = await fetchMarketNews(topAssets.assets.map((asset) => asset.id))
  const news = rawNews.length ? rawNews : syntheticNews(btc, eth, marketCapChange, btcDominance)

  const riskOn = (marketCapChange ?? 0) >= 0 && btc.change24h >= -1 && eth.change24h >= -1
  const ethLeadership = eth.change24h > btc.change24h
  const dominanceTone = (btcDominance ?? 0) >= 50 ? "Bitcoin remains the market anchor" : "capital is more distributed beyond Bitcoin"

  const keyFindings = [
    `BTC price: ${compactCurrency(btc.price)} (${compactPercent(btc.change24h)} 24h).`,
    `ETH price: ${compactCurrency(eth.price)} (${compactPercent(eth.change24h)} 24h).`,
    `Total crypto market cap: ${compactCurrency(totalMarketCap)} (${compactPercent(marketCapChange)} 24h).`,
    `24h market volume: ${compactCurrency(volume24h)}.`,
    `BTC dominance: ${compactPercent(btcDominance)}, so ${dominanceTone.toLowerCase()}.`,
  ]

  return {
    source: topAssets.source,
    updatedAt: new Date().toISOString(),
    metrics: {
      btcPrice: { label: "BTC Price", value: compactCurrency(btc.price), change: btc.change24h },
      ethPrice: { label: "ETH Price", value: compactCurrency(eth.price), change: eth.change24h },
      totalMarketCap: { label: "Market Cap", value: compactCurrency(totalMarketCap), change: marketCapChange },
      volume24h: { label: "24h Volume", value: compactCurrency(volume24h) },
      btcDominance: { label: "BTC Dominance", value: compactPercent(btcDominance) },
    },
    thesis: riskOn
      ? "The market backdrop is constructive but still dependent on BTC and ETH liquidity confirmation."
      : "The market backdrop is cautious, with broad direction still tied to BTC and ETH price stability.",
    summary: `BTC at ${compactCurrency(btc.price)} and ETH at ${compactCurrency(eth.price)} define the current market tone. Total market capitalization is ${compactCurrency(totalMarketCap)} with ${compactCurrency(volume24h)} in 24h volume. ${dominanceTone}. ${ethLeadership ? "ETH is outperforming BTC over 24h, which can support broader altcoin research." : "BTC is leading or holding up better than ETH, so risk appetite should be evaluated carefully before rotating into smaller assets."}`,
    keyFindings,
    risks: [
      "A drop in BTC price or rising BTC dominance can reduce liquidity for mid-cap tokens.",
      "Weak ETH relative performance can pressure smart-contract and DeFi beta.",
      "Lower 24h volume can make AI signals less reliable because price moves may be easier to distort.",
    ],
    news,
  }
}

export async function getTopAssets(): Promise<TopAssetsResult> {
  if (cachedTopAssets && cachedTopAssets.expiresAt > Date.now()) return cachedTopAssets.data

  try {
    const cmc = await fetchCoinMarketCapTopAssets()
    if (cmc) {
      cachedTopAssets = { data: cmc, expiresAt: Date.now() + cacheTtlMs }
      return cmc
    }
  } catch {
    // Fall through to CoinGecko when CoinMarketCap is unavailable or not configured.
  }

  try {
    const gecko = await fetchCoinGeckoTopAssets()
    cachedTopAssets = { data: gecko, expiresAt: Date.now() + cacheTtlMs }
    return gecko
  } catch {
    const demo: TopAssetsResult = {
      assets: fallbackAssets.map((asset) => ({ ...asset, source: "Demo" })),
      source: "Demo",
      updatedAt: new Date().toISOString(),
    }
    cachedTopAssets = { data: demo, expiresAt: Date.now() + cacheTtlMs }
    return demo
  }
}

export async function searchMarketAssets(query: string): Promise<TopAssetsResult> {
  const q = query.trim()
  if (!q) {
    return {
      assets: [],
      source: "Demo",
      updatedAt: new Date().toISOString(),
    }
  }

  const cacheKey = q.toLowerCase()
  const cached = cachedSearchAssets.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const topAssets = await getTopAssets()
  const localMatches = topAssets.assets.filter((asset) => {
    const name = asset.name.toLowerCase()
    const symbol = asset.symbol.toLowerCase()
    return name.includes(cacheKey) || symbol.includes(cacheKey)
  })

  try {
    const [remote, symbolMatches] = await Promise.all([
      fetchCoinGeckoSearchAssets(q),
      fetchCoinGeckoMarketsBySymbol(q).catch(() => []),
    ])
    const seen = new Set<string>()
    const assets = [...localMatches, ...symbolMatches, ...remote.assets]
      .filter((asset) => {
        if (seen.has(asset.id)) return false
        seen.add(asset.id)
        return true
      })
      .sort((a, b) => {
        const relevance = searchRelevance(a, cacheKey) - searchRelevance(b, cacheKey)
        if (relevance !== 0) return relevance
        return a.rank - b.rank
      })
    const data = {
      assets,
      source: remote.source,
      updatedAt: remote.updatedAt,
    }
    cachedSearchAssets.set(cacheKey, { data, expiresAt: Date.now() + cacheTtlMs })
    return data
  } catch {
    const data = {
      assets: localMatches,
      source: topAssets.source,
      updatedAt: new Date().toISOString(),
    }
    cachedSearchAssets.set(cacheKey, { data, expiresAt: Date.now() + cacheTtlMs })
    return data
  }
}

function searchRelevance(asset: Asset, normalizedQuery: string): number {
  const name = asset.name.toLowerCase()
  const symbol = asset.symbol.toLowerCase()
  if (symbol === normalizedQuery) return 0
  if (name === normalizedQuery) return 1
  if (symbol.startsWith(normalizedQuery)) return 2
  if (name.startsWith(normalizedQuery)) return 3
  if (symbol.includes(normalizedQuery)) return 4
  if (name.includes(normalizedQuery)) return 5
  return 6
}

export async function getMarketAsset(id: string): Promise<Asset> {
  const result = await getTopAssets()
  const knownAsset = result.assets.find((asset) => asset.id === id) ?? fallbackAssets.find((asset) => asset.id === id)
  if (knownAsset) return knownAsset

  try {
    const [asset] = await fetchCoinGeckoMarketsByIds([id])
    if (asset) return asset
  } catch {
    // Fall through to first available asset when the external lookup fails.
  }

  try {
    const searchResult = await searchMarketAssets(id)
    const normalized = id.toLowerCase()
    const searchedAsset =
      searchResult.assets.find((asset) => asset.id === normalized || asset.symbol.toLowerCase() === normalized || asset.name.toLowerCase() === normalized) ??
      searchResult.assets[0]
    if (searchedAsset) return searchedAsset
  } catch {
    // Fall through to first available asset when the external search fails.
  }

  return result.assets[0] ?? fallbackAssets[0]
}
