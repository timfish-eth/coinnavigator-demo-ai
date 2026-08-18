import type { Asset, Research } from "@/lib/data"
import type { MarketNewsItem } from "@/lib/market-data"

type ChatMessage = {
  role: "system" | "user"
  content: string
}

type ChatChoice = {
  message?: {
    content?: string
  }
}

type ChatResponse = {
  choices?: ChatChoice[]
}

export function hasConfiguredLlm(): boolean {
  return Boolean(process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.OLLAMA_BASE_URL)
}

function llmConfig() {
  const baseUrl =
    process.env.AI_BASE_URL ??
    process.env.OPENAI_BASE_URL ??
    process.env.OLLAMA_BASE_URL ??
    "https://api.openai.com/v1"
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey: process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "ollama",
    model: process.env.AI_MODEL ?? process.env.OPENAI_MODEL ?? (process.env.OLLAMA_BASE_URL ? "llama3.1" : "gpt-4o-mini"),
  }
}

function extractJsonObject(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")
    if (start < 0 || end <= start) throw new Error("LLM response did not contain JSON")
    return JSON.parse(text.slice(start, end + 1))
  }
}

function assertStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function parseResearch(value: unknown): Partial<Research> {
  if (!value || typeof value !== "object") throw new Error("Invalid research JSON")
  const data = value as Partial<Research>
  return {
    overview: typeof data.overview === "string" ? data.overview : undefined,
    marketPosition: typeof data.marketPosition === "string" ? data.marketPosition : undefined,
    growthDrivers: assertStringArray(data.growthDrivers),
    risks: assertStringArray(data.risks),
    summary: typeof data.summary === "string" ? data.summary : undefined,
  }
}

async function chat(messages: ChatMessage[]): Promise<string> {
  const config = llmConfig()
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  })

  if (!response.ok) {
    throw new Error(`LLM provider responded ${response.status}`)
  }

  const payload = await response.json() as ChatResponse
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error("LLM provider returned no content")
  return content
}

export async function generateResearchWithLlm(input: {
  asset: Asset
  baseResearch: Research
  news: MarketNewsItem[]
  reportType?: "quick" | "deep"
}): Promise<Partial<Research>> {
  if (!hasConfiguredLlm()) throw new Error("No LLM provider configured")

  const { asset, baseResearch, news, reportType = "quick" } = input
  const content = await chat([
    {
      role: "system",
      content:
        "You are a crypto research analyst. Return strict JSON only. Do not give investment advice or price targets.",
    },
    {
      role: "user",
      content: JSON.stringify({
        task:
          reportType === "deep"
            ? "Generate an advanced token research section set covering market, macroeconomic, financial, liquidity and risk dimensions."
            : "Generate a concise token research section set focused on summary, market position and primary risks.",
        requiredJsonShape: {
          overview: "string",
          marketPosition: "string",
          growthDrivers: ["string"],
          risks: ["string"],
          summary: "string",
        },
        asset,
        baselineResearch: {
          useCase: baseResearch.useCase,
          launch: baseResearch.launch,
          team: baseResearch.team,
          blockchain: baseResearch.blockchain,
          website: baseResearch.website,
        },
        recentNews: news.slice(0, 8),
      }),
    },
  ])

  return parseResearch(extractJsonObject(content))
}
