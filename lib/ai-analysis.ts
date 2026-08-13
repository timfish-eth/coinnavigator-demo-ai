import type { Asset, Impact, Narrative } from "@/lib/data"
import { aiScore } from "@/lib/data"
import { getMarketResearchReport, getTopAssets, type MarketNewsItem, type MarketResearchReport } from "@/lib/market-data"

export type ComputedInsight = {
  id: string
  category: string
  headline: string
  explanation: string
  impact: Impact
  relatedTokens: string[]
}

export type ComputedFeaturedAsset = {
  id: string
  score: number
  whyTrending: string
  strengths: string[]
  risks: string[]
}

export type MarketAnalysis = {
  report: MarketResearchReport
  narratives: Narrative[]
  insights: ComputedInsight[]
  featuredAssets: ComputedFeaturedAsset[]
}

const devActivityByCategory: Record<string, number> = {
  AI: 82,
  "Layer 1": 78,
  "Layer 2": 72,
  RWA: 66,
  DePIN: 70,
  DeFi: 76,
  Oracle: 74,
  Stablecoin: 52,
  Market: 58,
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

function impactFor(score: number): Impact {
  if (score >= 78) return "High"
  if (score >= 62) return "Medium"
  return "Low"
}

function changeScore(change: number): number {
  return clamp(50 + change * 5)
}

function attentionScore(asset: Asset): number {
  return clamp(asset.activity + (asset.rank <= 10 ? 10 : asset.rank <= 50 ? 4 : 0))
}

function newsScore(category: string, tokens: Asset[], news: MarketNewsItem[]): number {
  const categoryText = category.toLowerCase()
  const tokenSymbols = new Set(tokens.map((asset) => asset.symbol.toUpperCase()))
  const mentions = news.reduce((count, item) => {
    const title = item.title.toLowerCase()
    const hasCategory = title.includes(categoryText)
    const hasToken = item.relatedSymbols.some((symbol) => tokenSymbols.has(symbol.toUpperCase())) ||
      tokens.some((asset) => title.includes(asset.name.toLowerCase()) || title.includes(asset.symbol.toLowerCase()))
    return count + (hasCategory || hasToken ? 1 : 0)
  }, 0)
  return clamp(45 + mentions * 18 + Math.min(tokens.length, 6) * 3)
}

function narrativeDescription(category: string, tokens: Asset[], score: number): string {
  const leaders = tokens
    .slice()
    .sort((a, b) => aiScore(b) - aiScore(a))
    .slice(0, 3)
    .map((asset) => asset.symbol)
  const tone = score >= 78 ? "Strong market attention" : score >= 62 ? "Constructive but selective activity" : "Developing activity"
  return `${tone} across ${category} assets, led by ${leaders.join(", ")}.`
}

function computeNarratives(assets: Asset[], news: MarketNewsItem[]): Narrative[] {
  const groups = new Map<string, Asset[]>()
  for (const asset of assets) {
    if (asset.category === "Stablecoin") continue
    const group = groups.get(asset.category) ?? []
    group.push(asset)
    groups.set(asset.category, group)
  }

  return Array.from(groups.entries())
    .map(([category, tokens]) => {
      const marketStrength = tokens.reduce((sum, asset) => sum + changeScore(asset.change24h), 0) / tokens.length
      const newsMentions = newsScore(category, tokens, news)
      const devActivity = devActivityByCategory[category] ?? 58
      const socialAttention = tokens.reduce((sum, asset) => sum + attentionScore(asset), 0) / tokens.length
      const score = Math.round(
        marketStrength * 0.3 +
        newsMentions * 0.3 +
        devActivity * 0.2 +
        socialAttention * 0.2,
      )

      return {
        name: category,
        activity: score,
        change: Number((tokens.reduce((sum, asset) => sum + asset.change24h, 0) / tokens.length).toFixed(1)),
        assets: tokens
          .slice()
          .sort((a, b) => aiScore(b) - aiScore(a))
          .slice(0, 4)
          .map((asset) => asset.symbol),
        note: narrativeDescription(category, tokens, score),
      }
    })
    .sort((a, b) => b.activity - a.activity)
    .slice(0, 6)
}

function researchScore(asset: Asset, narrativeScore: number): number {
  const fundamental = clamp(100 - asset.rank * 0.7)
  const devActivity = devActivityByCategory[asset.category] ?? 58
  const marketAttention = attentionScore(asset)
  const riskScore = asset.risk === "Low" ? 90 : asset.risk === "Medium" ? 68 : 42

  return Math.round(
    narrativeScore * 0.3 +
    fundamental * 0.25 +
    devActivity * 0.2 +
    marketAttention * 0.15 +
    riskScore * 0.1,
  )
}

function computeFeaturedAssets(assets: Asset[], narratives: Narrative[]): ComputedFeaturedAsset[] {
  const narrativeByName = new Map(narratives.map((narrative) => [narrative.name, narrative.activity]))

  return assets
    .map((asset) => {
      const score = researchScore(asset, narrativeByName.get(asset.category) ?? 58)
      return {
        id: asset.id,
        score,
        whyTrending: `${asset.symbol} ranks #${asset.rank}, trades ${asset.change24h >= 0 ? "up" : "down"} ${Math.abs(asset.change24h).toFixed(2)}% in 24h, and belongs to the ${asset.category} narrative.`,
        strengths: [
          `Market cap rank #${asset.rank}`,
          `${asset.volume} in 24h volume`,
          `${asset.category} narrative score ${narrativeByName.get(asset.category) ?? 58}`,
        ],
        risks: [
          `${asset.risk} composite risk`,
          asset.change24h < 0 ? "Negative 24h momentum" : "Momentum can reverse quickly",
        ],
      }
    })
    .sort((a, b) => b.score - a.score)
}

function computeInsights(report: MarketResearchReport, narratives: Narrative[]): ComputedInsight[] {
  const topNarrative = narratives[0]
  const secondNarrative = narratives[1]
  const btcDominance = report.metrics.btcDominance.value
  const marketCapChange = report.metrics.totalMarketCap.change ?? 0

  const insights: ComputedInsight[] = []
  if (topNarrative) {
    insights.push({
      id: `narrative-${topNarrative.name.toLowerCase().replace(/\s+/g, "-")}`,
      category: topNarrative.name,
      headline: `${topNarrative.name} leads current research attention`,
      explanation: `${topNarrative.note} Narrative score is ${topNarrative.activity}, based on market momentum, news/event mentions, development activity and attention.`,
      impact: impactFor(topNarrative.activity),
      relatedTokens: topNarrative.assets,
    })
  }

  insights.push({
    id: "btc-dominance",
    category: "Market Structure",
    headline: `BTC dominance is ${btcDominance}`,
    explanation: "Bitcoin dominance helps determine whether liquidity is concentrated in BTC or rotating into ETH and other assets.",
    impact: "High",
    relatedTokens: ["BTC", "ETH"],
  })

  insights.push({
    id: "market-cap-change",
    category: "Liquidity",
    headline: marketCapChange >= 0 ? "Total market cap is expanding" : "Total market cap is contracting",
    explanation: `${report.metrics.totalMarketCap.label} is ${report.metrics.totalMarketCap.value} with ${marketCapChange >= 0 ? "+" : ""}${marketCapChange.toFixed(2)}% 24h movement. This is a primary input for risk appetite.`,
    impact: Math.abs(marketCapChange) >= 2 ? "High" : "Medium",
    relatedTokens: ["BTC", "ETH"],
  })

  if (secondNarrative) {
    insights.push({
      id: `watch-${secondNarrative.name.toLowerCase().replace(/\s+/g, "-")}`,
      category: secondNarrative.name,
      headline: `${secondNarrative.name} is the next narrative to monitor`,
      explanation: `${secondNarrative.note} Watch whether volume and news mentions continue to build.`,
      impact: impactFor(secondNarrative.activity),
      relatedTokens: secondNarrative.assets,
    })
  }

  return insights.slice(0, 4)
}

export async function getMarketAnalysis(): Promise<MarketAnalysis> {
  const [topAssets, report] = await Promise.all([getTopAssets(), getMarketResearchReport()])
  const narratives = computeNarratives(topAssets.assets, report.news)
  return {
    report,
    narratives,
    insights: computeInsights(report, narratives),
    featuredAssets: computeFeaturedAssets(topAssets.assets, narratives),
  }
}
