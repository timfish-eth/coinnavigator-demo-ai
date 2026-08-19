import { getMarketAnalysis, type MarketAnalysis } from "@/lib/ai-analysis"
import { getResearch, type Asset, type Impact, type Research, type RiskLevel } from "@/lib/data"
import { generateResearchWithLlm } from "@/lib/llm"
import { getMarketAsset, searchMarketAssets } from "@/lib/market-data"
import { DEFAULT_REPORT_CHAIN_ID, normalizeReportChainId } from "@/lib/report-network"
import { readStoredTokenReport, withReportLock, writeStoredTokenReport } from "@/lib/report-storage"
import { getDailyTokenNews } from "@/lib/token-news"

const DAY_MS = 24 * 60 * 60 * 1000
const REPORT_TTL_DAYS = 7
const REPORT_TTL_MS = REPORT_TTL_DAYS * DAY_MS
const TOKEN_REPORT_TEMPLATE_VERSION = "v3"

export type TokenProfile = {
  asset: Asset
  createdAt: string
}

export type TokenReport = {
  id: string
  asset: Asset
  report: Research
  chainId: number
  reportType: "quick" | "deep"
  generatedAt: string
  expiresAt: string
  cacheStatus: "hit" | "generated"
  inputs: {
    marketDataDate: string
    newsWindow: "24h"
    tradingDataSource: string
    newsCount: number
    inputFingerprint: string
  }
}

export function normalizeReportType(value?: string | null): TokenReport["reportType"] {
  return value === "deep" || value === "full" ? "deep" : "quick"
}

type StoredTokenReport = Omit<TokenReport, "cacheStatus">

type ResearchStore = {
  dailyMarketAnalysis: Map<string, MarketAnalysis>
  tokenProfiles: Map<string, TokenProfile>
  tokenReports: Map<string, StoredTokenReport>
}

const store = globalThis as typeof globalThis & {
  __coinnavigatorResearchStore?: ResearchStore
}

function researchStore(): ResearchStore {
  store.__coinnavigatorResearchStore ??= {
    dailyMarketAnalysis: new Map(),
    tokenProfiles: new Map(),
    tokenReports: new Map(),
  }
  return store.__coinnavigatorResearchStore
}

function dateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function reportKey(chainId: number, assetId: string, reportType: TokenReport["reportType"], day = dateKey()): string {
  return `chain-${normalizeReportChainId(chainId)}:${assetId}:${reportType}:${day}:${TOKEN_REPORT_TEMPLATE_VERSION}`
}

function legacyReportKey(assetId: string, reportType: TokenReport["reportType"], day = dateKey()): string {
  return `${assetId}:${reportType}:${day}:${TOKEN_REPORT_TEMPLATE_VERSION}`
}

function withReportDefaults(report: StoredTokenReport): StoredTokenReport {
  return {
    ...report,
    chainId: normalizeReportChainId(report.chainId),
    inputs: {
      marketDataDate: report.inputs?.marketDataDate ?? report.generatedAt.slice(0, 10),
      newsWindow: "24h",
      tradingDataSource: report.inputs?.tradingDataSource ?? report.asset.source ?? "Market data",
      newsCount: report.inputs?.newsCount ?? report.report.latestIntel.length,
      inputFingerprint: report.inputs?.inputFingerprint ?? "LEGACY",
    },
  }
}

function isExpired(report: StoredTokenReport, now = Date.now()): boolean {
  return new Date(report.expiresAt).getTime() <= now
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

function riskLevel(score: number): RiskLevel {
  if (score >= 75) return "Low"
  if (score >= 55) return "Medium"
  return "High"
}

function impactFor(asset: Asset, newsIndex: number): Impact {
  if (newsIndex === 0 || asset.activity >= 80 || Math.abs(asset.change24h) >= 5) return "High"
  if (asset.activity >= 60 || Math.abs(asset.change24h) >= 2) return "Medium"
  return "Low"
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-"
  if (value >= 1) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
  return `$${value.toLocaleString("en-US", { maximumSignificantDigits: 4 })}`
}

function dailyInputFingerprint(asset: Asset, news: MarketAnalysis["report"]["news"], day: string): string {
  const raw = [
    day,
    asset.id,
    asset.price,
    asset.change24h,
    asset.marketCap,
    asset.volume,
    asset.rank,
    ...news.slice(0, 6).map((item) => `${item.source}:${item.title}:${item.publishedAt ?? ""}`),
  ].join("|")
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
  }
  return hash.toString(36).toUpperCase().padStart(7, "0")
}

function dailyTradingSummary(asset: Asset, news: MarketAnalysis["report"]["news"], day: string): string {
  const source = asset.source ?? "market data"
  const change = `${asset.change24h >= 0 ? "+" : ""}${asset.change24h.toFixed(2)}%`
  return `Daily trading snapshot (${day}) uses ${source} aggregate exchange-market data: spot price ${formatPrice(asset.price)}, 24h change ${change}, 24h volume ${asset.volume}, market cap ${asset.marketCap}, rank #${asset.rank}, and ${news.length} relevant 24h news item${news.length === 1 ? "" : "s"}.`
}

function sourceLabel(item: { source?: string; url?: string }, fallback: string): string {
  if (item.source) return item.source
  if (!item.url) return fallback
  try {
    return new URL(item.url).hostname.replace(/^www\./, "") || fallback
  } catch {
    return fallback
  }
}

function newsIntel(asset: Asset, news: { title: string; source: string; url?: string; publishedAt?: string }[]): Research["latestIntel"] {
  if (news.length) {
    return news.slice(0, 4).map((item, index) => ({
      time: item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("en-US", { timeZone: "UTC" }) : "Today",
      source: sourceLabel(item, "News"),
      headline: item.title,
      impact: impactFor(asset, index),
    }))
  }

  return [
    {
      time: "Today",
      source: asset.source ?? "Market data",
      headline: asset.event,
      impact: impactFor(asset, 0),
    },
  ]
}

function buildDataDrivenResearch(
  asset: Asset,
  marketAnalysis: MarketAnalysis,
  news: MarketAnalysis["report"]["news"],
  reportType: TokenReport["reportType"] = "quick",
  generatedAt = new Date(),
): Research {
  const base = getResearch(asset)
  const day = dateKey(generatedAt)
  const inputFingerprint = dailyInputFingerprint(asset, news, day)
  const tradingSummary = dailyTradingSummary(asset, news, day)
  const narrative = marketAnalysis.narratives.find((item) => item.name === asset.category)
  const featured = marketAnalysis.featuredAssets.find((item) => item.id === asset.id)
  const volumeScore = clamp(asset.activity)
  const rankScore = clamp(100 - asset.rank * 0.7)
  const momentumScore = clamp(50 + asset.change24h * 5)
  const riskScore = asset.risk === "Low" ? 82 : asset.risk === "Medium" ? 66 : 48
  const overall = featured?.score ?? Math.round(rankScore * 0.35 + volumeScore * 0.3 + momentumScore * 0.2 + riskScore * 0.15)
  const compositeScore = (overall / 10).toFixed(1)
  const sectorChange = narrative?.change ?? asset.change24h
  const sectorScore = narrative?.activity ?? asset.activity
  const newsCount = news.length

  const fullResearch: Research = {
    ...base,
    overview: `${asset.name} is a ${asset.category} asset currently ranked #${asset.rank} by market capitalization. The ${day} profile is generated from aggregate exchange-market data, category momentum and the latest 24h news available to the app.`,
    marketPosition: `${asset.name} trades at ${formatPrice(asset.price)} with ${asset.volume} in 24h volume and ${asset.marketCap} market capitalization. Its ${asset.category} narrative score is ${sectorScore}, with average category movement of ${sectorChange >= 0 ? "+" : ""}${sectorChange.toFixed(2)}% over 24h. ${tradingSummary}`,
    growthDrivers: featured?.strengths.length
      ? featured.strengths
      : [
          `${day} rank #${asset.rank} market position`,
          `${asset.volume} 24h trading volume from ${asset.source ?? "market"} data`,
          `${asset.category} narrative score ${sectorScore}`,
          `${newsCount} relevant daily news item${newsCount === 1 ? "" : "s"} tracked`,
        ],
    risks: featured?.risks.length
      ? featured.risks
      : [
          `${asset.risk} composite market risk`,
          asset.change24h < 0 ? "Negative 24h price momentum" : "Positive momentum can reverse quickly",
          "Research quality depends on available market and news coverage",
        ],
    summary: `${asset.name} shows a ${asset.signal.toLowerCase()} near-term market signal, ${asset.risk.toLowerCase()} risk and an AI research score of ${overall} for ${day}. The current read is driven by aggregate exchange trading data, rank, 24h movement, volume/activity, sector narrative strength and daily news coverage. Daily input fingerprint: ${inputFingerprint}. This is research information, not financial advice.`,
    compositeScore,
    website: `www.coingecko.com/en/coins/${asset.id}`,
    fundamentals: [
      {
        title: "Market Snapshot",
        description: `${asset.name} is ranked #${asset.rank} with ${asset.marketCap} market capitalization, ${asset.volume} 24h volume and ${formatPrice(asset.price)} spot price on ${day}.`,
        details: [
          { label: "Source", value: asset.source ?? "Market data" },
          { label: "Spot Price", value: formatPrice(asset.price) },
          { label: "24h Change", value: `${asset.change24h >= 0 ? "+" : ""}${asset.change24h.toFixed(2)}%` },
        ],
      },
      {
        title: "Daily Input Digest",
        description: `This report is keyed to ${day} market and news inputs so the daily report changes when trading data or 24h news changes.`,
        details: [
          { label: "Input Fingerprint", value: inputFingerprint },
          { label: "News Items", value: String(newsCount) },
        ],
      },
      {
        title: "Narrative Position",
        description: `${asset.category} has a current narrative score of ${sectorScore}.`,
        details: [
          { label: "Sector", value: asset.category },
          { label: "Sector 24h", value: `${sectorChange >= 0 ? "+" : ""}${sectorChange.toFixed(2)}%` },
        ],
      },
      {
        title: "Liquidity & Attention",
        description: `The app estimates attention from rank, volume-to-market-cap context and recent market activity.`,
        details: [
          { label: "Activity Score", value: String(asset.activity) },
          { label: "Signal", value: asset.signal },
        ],
      },
    ],
    ecosystem: {
      ...base.ecosystem,
      devActivity: asset.activity >= 80 ? "High" : asset.activity >= 60 ? "Elevated" : "Moderate",
      growth: sectorChange >= 1 ? "Expanding" : sectorChange <= -1 ? "Contracting" : "Stable",
    },
    performance: [
      { label: "Price", value: Number(asset.price.toFixed(asset.price >= 1 ? 2 : 6)) },
      { label: "24H", value: Number(asset.change24h.toFixed(2)) },
      { label: "Narrative", value: Number(sectorChange.toFixed(2)) },
      { label: "AI Score", value: overall },
    ],
    marketInterest: [
      { label: "Spot Price", value: formatPrice(asset.price), change: asset.change24h },
      { label: "24h Volume", value: asset.volume, change: asset.change24h },
      { label: "News Coverage", value: `${newsCount} item${newsCount === 1 ? "" : "s"}`, change: newsCount * 2 },
      { label: "Market Signal", value: asset.signal, change: momentumScore - 50 },
    ],
    riskScores: [
      { label: "Market Risk", level: asset.risk, note: "Derived from rank and 24h volatility" },
      { label: "Liquidity Risk", level: riskLevel(rankScore), note: "Estimated from market-cap rank and accessibility" },
      { label: "Momentum Risk", level: riskLevel(100 - Math.abs(asset.change24h) * 6), note: "Higher short-term movement increases reversal risk" },
      { label: "Coverage Risk", level: newsCount ? "Medium" : "High", note: "Depends on available daily news coverage" },
    ],
    onchain: [
      { label: "Market Activity", value: `${asset.activity}/100`, change: asset.change24h, hint: "Proxy from rank, volume and liquidity" },
      { label: "Narrative Strength", value: `${sectorScore}/100`, change: sectorChange, hint: "Category momentum and news/event mentions" },
      { label: "Liquidity Rank", value: `#${asset.rank}`, change: rankScore - 50, hint: "Market-cap rank proxy" },
      { label: "Exchange Flow Proxy", value: asset.change24h >= 0 ? "Demand improving" : "Supply pressure", change: asset.change24h, hint: "Direction inferred from 24h market move" },
    ],
    social: [
      { label: "News Coverage", value: `${newsCount} daily item${newsCount === 1 ? "" : "s"}`, change: newsCount * 2 },
      { label: "Attention Score", value: `${asset.activity}/100`, change: asset.activity - 50 },
      { label: "Narrative Score", value: `${sectorScore}/100`, change: sectorChange },
    ],
    aiRating: {
      overall,
      breakdown: [
        { label: "Market Position", score: Math.round(rankScore) },
        { label: "Liquidity/Attention", score: Math.round(volumeScore) },
        { label: "Momentum", score: Math.round(momentumScore) },
        { label: "Risk", score: riskScore },
      ],
    },
    narratives: narrative ? [narrative.name, ...narrative.assets.filter((symbol) => symbol !== asset.symbol).slice(0, 3)] : base.narratives,
    latestIntel: newsIntel(asset, news),
  }

  if (reportType === "deep") {
    return {
      ...fullResearch,
      summary: `${fullResearch.summary} Advanced analysis extends the view across market structure, macro liquidity, financial quality, token mechanics, ecosystem durability and multi-factor risk.`,
      fundamentals: [
        ...fullResearch.fundamentals,
        {
          title: "Economic Context",
          description: `${asset.name} should be evaluated against broad crypto liquidity, BTC dominance, risk appetite and the current ${asset.category} cycle for ${day}.`,
          details: [
            { label: "Market Cap Cycle", value: marketAnalysis.report.metrics.totalMarketCap.value },
            { label: "BTC Dominance", value: marketAnalysis.report.metrics.btcDominance.value },
          ],
        },
        {
          title: "Financial Quality",
          description: `Financial strength is proxied through market cap rank, trading volume depth, spot price movement, attention score and resilience under the latest 24h market movement.`,
          details: [
            { label: "Spot Price", value: formatPrice(asset.price) },
            { label: "24h Volume", value: asset.volume },
            { label: "Liquidity Rank", value: `#${asset.rank}` },
          ],
        },
        {
          title: "News & Event Delta",
          description: `Advanced research incorporates the latest 24h token-specific news set and market-wide fallback news when token-specific coverage is thin.`,
          details: [
            { label: "Daily Fingerprint", value: inputFingerprint },
            { label: "News Window", value: "24h" },
          ],
        },
      ],
      marketInterest: [
        ...fullResearch.marketInterest,
        { label: "Market Cap", value: asset.marketCap, change: rankScore - 50 },
        { label: "Macro Liquidity", value: marketAnalysis.report.metrics.volume24h.value, change: marketAnalysis.report.metrics.totalMarketCap.change ?? 0 },
        { label: "BTC Dominance", value: marketAnalysis.report.metrics.btcDominance.value, change: 0 },
      ],
      riskScores: [
        ...fullResearch.riskScores,
        { label: "Macro Risk", level: riskLevel(65 + (marketAnalysis.report.metrics.totalMarketCap.change ?? 0) * 4), note: "Sensitivity to broad liquidity and BTC-led risk cycles" },
        { label: "Financial Risk", level: riskLevel((rankScore + volumeScore) / 2), note: "Market depth, capitalization rank and trading quality" },
        { label: "Narrative Risk", level: riskLevel(sectorScore), note: "Durability of category attention and sector rotation" },
      ],
      onchain: [
        ...fullResearch.onchain,
        { label: "Macro Liquidity Proxy", value: marketAnalysis.report.metrics.volume24h.value, change: marketAnalysis.report.metrics.totalMarketCap.change ?? 0, hint: "Global market volume and market-cap movement" },
        { label: "Sector Rotation", value: `${sectorChange >= 0 ? "+" : ""}${sectorChange.toFixed(2)}%`, change: sectorChange, hint: "Average movement of related category assets" },
      ],
      social: [
        ...fullResearch.social,
        { label: "Daily News Inputs", value: `${newsCount}`, change: newsCount * 2 },
        { label: "Research Breadth", value: "Advanced", change: 10 },
      ],
    }
  }

  return {
    ...fullResearch,
    fundamentals: fullResearch.fundamentals.slice(0, 2),
    marketInterest: [fullResearch.marketInterest[0], fullResearch.marketInterest[1], fullResearch.marketInterest[3]],
    riskScores: fullResearch.riskScores.slice(0, 3),
    onchain: fullResearch.onchain.slice(0, 2),
    social: fullResearch.social.slice(0, 2),
    latestIntel: fullResearch.latestIntel.slice(0, 2),
  }
}

function ensureDailyContext(
  report: Research,
  asset: Asset,
  news: MarketAnalysis["report"]["news"],
  generatedAt: Date,
): Research {
  const day = dateKey(generatedAt)
  const inputFingerprint = dailyInputFingerprint(asset, news, day)
  const marker = `Daily input fingerprint: ${inputFingerprint}.`
  const tradingSummary = dailyTradingSummary(asset, news, day)
  const summary = report.summary.includes(inputFingerprint) ? report.summary : `${report.summary} ${marker}`
  const marketPosition = report.marketPosition.includes(inputFingerprint)
    ? report.marketPosition
    : `${report.marketPosition} ${tradingSummary} ${marker}`

  return {
    ...report,
    summary,
    marketPosition,
  }
}

export function pruneExpiredTokenReports(now = Date.now()) {
  const db = researchStore()
  for (const [key, report] of db.tokenReports) {
    if (new Date(report.expiresAt).getTime() <= now) {
      db.tokenReports.delete(key)
    }
  }
}

export async function getDailyMarketAnalysis(): Promise<MarketAnalysis> {
  const db = researchStore()
  const key = dateKey()
  const cached = db.dailyMarketAnalysis.get(key)
  if (cached) return cached

  const analysis = await getMarketAnalysis()
  db.dailyMarketAnalysis.set(key, analysis)
  return analysis
}

export async function getOrCreateTokenProfile(assetId: string): Promise<TokenProfile> {
  const db = researchStore()
  const cached = db.tokenProfiles.get(assetId)
  if (cached && dateKey(new Date(cached.createdAt)) === dateKey()) return cached

  const profile = {
    asset: await getMarketAsset(assetId),
    createdAt: new Date().toISOString(),
  }
  db.tokenProfiles.set(profile.asset.id, profile)
  return profile
}

export async function getTokenResearchSnapshot(asset: Asset): Promise<Research> {
  const [dailyAnalysis, tokenNews] = await Promise.all([
    getDailyMarketAnalysis(),
    getDailyTokenNews(asset),
  ])
  const reportNews = tokenNews.length ? tokenNews : dailyAnalysis.report.news
  return buildDataDrivenResearch(asset, dailyAnalysis, reportNews, "quick")
}

export async function getStoredTokenReport(input: {
  assetId: string
  chainId?: number
  reportType: TokenReport["reportType"]
  generatedAt?: string
}): Promise<TokenReport | null> {
  const chainId = normalizeReportChainId(input.chainId)
  const day = input.generatedAt?.slice(0, 10) ?? dateKey()
  const key = reportKey(chainId, input.assetId, input.reportType, day)
  const fallbackKey = chainId === DEFAULT_REPORT_CHAIN_ID ? legacyReportKey(input.assetId, input.reportType, day) : undefined
  const db = researchStore()
  const cached = db.tokenReports.get(key)
  if (cached && !isExpired(cached)) return { ...cached, cacheStatus: "hit" }

  const legacyCached = fallbackKey ? db.tokenReports.get(fallbackKey) : undefined
  if (legacyCached && !isExpired(legacyCached)) return { ...withReportDefaults(legacyCached), cacheStatus: "hit" }

  const storedOnDisk = await readStoredTokenReport(key)
  const legacyStoredOnDisk = !storedOnDisk && fallbackKey ? await readStoredTokenReport(fallbackKey) : null
  const reportOnDisk = storedOnDisk ?? legacyStoredOnDisk
  if (!reportOnDisk || isExpired(reportOnDisk)) return null

  const normalized = withReportDefaults(reportOnDisk)
  db.tokenReports.set(key, normalized)
  return { ...normalized, cacheStatus: "hit" }
}

export async function resolveTokenForReport(input: { assetId?: string; query?: string; assetSnapshot?: Asset }): Promise<Asset> {
  if (input.assetId) {
    const profile = await getOrCreateTokenProfile(input.assetId)
    if (profile.asset.id === input.assetId) return profile.asset
    if (input.assetSnapshot?.id === input.assetId) {
      const db = researchStore()
      db.tokenProfiles.set(input.assetSnapshot.id, {
        asset: input.assetSnapshot,
        createdAt: new Date().toISOString(),
      })
      return input.assetSnapshot
    }
    return profile.asset
  }

  if (input.assetSnapshot) {
    const db = researchStore()
    db.tokenProfiles.set(input.assetSnapshot.id, {
      asset: input.assetSnapshot,
      createdAt: new Date().toISOString(),
    })
    return input.assetSnapshot
  }

  const query = input.query?.trim()
  if (!query) return (await getOrCreateTokenProfile("bitcoin")).asset

  const results = await searchMarketAssets(query)
  const normalized = query.toLowerCase()
  const exact =
    results.assets.find((asset) => asset.symbol.toLowerCase() === normalized || asset.name.toLowerCase() === normalized) ??
    results.assets[0]

  if (!exact) return (await getOrCreateTokenProfile("bitcoin")).asset
  const db = researchStore()
  db.tokenProfiles.set(exact.id, {
    asset: exact,
    createdAt: new Date().toISOString(),
  })
  return exact
}

export async function getOrCreateTokenReport(input: {
  assetId?: string
  query?: string
  assetSnapshot?: Asset
  chainId?: number
  reportType?: TokenReport["reportType"]
}): Promise<TokenReport> {
  pruneExpiredTokenReports()

  const chainId = normalizeReportChainId(input.chainId)
  const reportType = input.reportType ?? "quick"
  const asset = await resolveTokenForReport(input)
  const key = reportKey(chainId, asset.id, reportType)
  const fallbackKey = chainId === DEFAULT_REPORT_CHAIN_ID ? legacyReportKey(asset.id, reportType) : undefined
  const db = researchStore()
  const cached = db.tokenReports.get(key)
  if (cached && !isExpired(cached)) return { ...cached, cacheStatus: "hit" }

  const legacyCached = fallbackKey ? db.tokenReports.get(fallbackKey) : undefined
  if (legacyCached && !isExpired(legacyCached)) return { ...withReportDefaults(legacyCached), cacheStatus: "hit" }

  const storedOnDisk = await readStoredTokenReport(key)
  const legacyStoredOnDisk = !storedOnDisk && fallbackKey ? await readStoredTokenReport(fallbackKey) : null
  const reportOnDisk = storedOnDisk ?? legacyStoredOnDisk
  if (reportOnDisk && !isExpired(reportOnDisk)) {
    const normalized = withReportDefaults(reportOnDisk)
    db.tokenReports.set(key, normalized)
    return { ...normalized, cacheStatus: "hit" }
  }

  return withReportLock(`token-report:${key}`, async () => {
    const cachedAfterWait = db.tokenReports.get(key)
    if (cachedAfterWait && !isExpired(cachedAfterWait)) return { ...cachedAfterWait, cacheStatus: "hit" }

    const legacyCachedAfterWait = fallbackKey ? db.tokenReports.get(fallbackKey) : undefined
    if (legacyCachedAfterWait && !isExpired(legacyCachedAfterWait)) return { ...withReportDefaults(legacyCachedAfterWait), cacheStatus: "hit" }

    const diskAfterWait = await readStoredTokenReport(key)
    const legacyDiskAfterWait = !diskAfterWait && fallbackKey ? await readStoredTokenReport(fallbackKey) : null
    const reportAfterWait = diskAfterWait ?? legacyDiskAfterWait
    if (reportAfterWait && !isExpired(reportAfterWait)) {
      const normalized = withReportDefaults(reportAfterWait)
      db.tokenReports.set(key, normalized)
      return { ...normalized, cacheStatus: "hit" }
    }

    const generatedAt = new Date()
    const dailyAnalysis = await getDailyMarketAnalysis()
    const tokenNews = await getDailyTokenNews(asset)
    const reportNews = tokenNews.length ? tokenNews : dailyAnalysis.report.news
    const inputFingerprint = dailyInputFingerprint(asset, reportNews, dateKey(generatedAt))
    const baseResearch = buildDataDrivenResearch(asset, dailyAnalysis, reportNews, reportType, generatedAt)
    let report = baseResearch
    try {
      const aiResearch = await generateResearchWithLlm({
        asset,
        baseResearch,
        news: reportNews,
        reportType,
      })
      report = {
        ...baseResearch,
        ...aiResearch,
        growthDrivers: aiResearch.growthDrivers?.length ? aiResearch.growthDrivers : baseResearch.growthDrivers,
        risks: aiResearch.risks?.length ? aiResearch.risks : baseResearch.risks,
      }
    } catch {
      report = baseResearch
    }
    report = ensureDailyContext(report, asset, reportNews, generatedAt)

    const stored: StoredTokenReport = {
      id: key,
      asset,
      report,
      chainId,
      reportType,
      generatedAt: generatedAt.toISOString(),
      expiresAt: new Date(generatedAt.getTime() + REPORT_TTL_MS).toISOString(),
      inputs: {
        marketDataDate: dateKey(generatedAt),
        newsWindow: "24h",
        tradingDataSource: asset.source ?? "Market data",
        newsCount: reportNews.length,
        inputFingerprint,
      },
    }
    db.tokenReports.set(key, stored)
    await writeStoredTokenReport(key, stored)
    return { ...stored, cacheStatus: "generated" }
  })
}
