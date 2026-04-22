import Anthropic from '@anthropic-ai/sdk'
import { TickerNews, DigestEntry, DigestSignal, EventType, MechanismImpact, Sentiment, EarlyWarning } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const VALID_EVENTS = new Set<string>([
  'earnings', 'guidance_change', 'ma', 'regulation', 'product_launch',
  'macro_impact', 'analyst_change', 'expansion', 'restructuring', 'other',
])
const VALID_MECHANISM = new Set<string>(['increase', 'decrease', 'unclear'])
const VALID_GROWTH = new Set<string>(['positive', 'negative', 'unclear'])
const VALID_SENTIMENT = new Set<string>(['bullish', 'neutral', 'bearish'])
const VALID_WARNINGS = new Set<string>(['new_risk', 'sentiment_shift', 'volume_spike', 'source_convergence'])

interface AnalysisResult {
  ticker: string
  citations: number[]
  events: string[]
  mechanisms: { revenue: string; costs: string; growth: string; risk: string }
  sentiment: string
  earlyWarnings: string[]
  insight: string
}

function parseSignal(raw: AnalysisResult): DigestSignal | undefined {
  const events = (raw.events ?? []).filter(e => VALID_EVENTS.has(e)) as EventType[]
  const m = raw.mechanisms
  if (!m) return undefined

  const revenue = VALID_MECHANISM.has(m.revenue) ? m.revenue as MechanismImpact : 'unclear'
  const costs = VALID_MECHANISM.has(m.costs) ? m.costs as MechanismImpact : 'unclear'
  const growth = VALID_GROWTH.has(m.growth) ? m.growth as 'positive' | 'negative' | 'unclear' : 'unclear'
  const risk = VALID_MECHANISM.has(m.risk) ? m.risk as MechanismImpact : 'unclear'
  const sentiment = VALID_SENTIMENT.has(raw.sentiment) ? raw.sentiment as Sentiment : 'neutral'
  const earlyWarnings = (raw.earlyWarnings ?? []).filter(w => VALID_WARNINGS.has(w)) as EarlyWarning[]

  // If everything is default/empty, no meaningful signal
  if (events.length === 0 && earlyWarnings.length === 0 && sentiment === 'neutral') return undefined

  return {
    events,
    mechanisms: { revenue, costs, growth, risk },
    sentiment,
    earlyWarnings,
  }
}

export async function summarizeNewsForUser(
  tickerNews: TickerNews[],
  language = 'en',
  previousInsights?: Map<string, string>,
): Promise<DigestEntry[]> {
  for (const t of tickerNews) {
    console.log(`[finnhub] ${t.ticker}: ${t.articles.length} article(s)`, t.articles.map(a => a.headline))
  }

  const withArticles = tickerNews.filter(t => t.articles.length > 0)
  if (withArticles.length === 0) {
    return tickerNews.map(t => ({
      ticker: t.ticker,
      company: t.company,
      insight: language === 'zh' ? '今日无重大进展。' : 'No significant developments today.',
      sources: [],
    }))
  }

  const newsBlock = withArticles.map(t => {
    const articles = t.articles
      .map((a, i) => `  [${i + 1}] ${a.headline}${a.summary ? ': ' + a.summary.slice(0, 200) : ''}`)
      .join('\n')
    return `${t.ticker} (${t.company}):\n${articles}`
  }).join('\n\n')

  const isZh = language === 'zh'
  const fallbackPhrase = isZh ? '今日无重大进展。' : 'No significant developments today.'
  const languageInstruction = isZh
    ? 'LANGUAGE RULE: Write the "insight" value in Simplified Chinese (简体中文). All JSON keys, field names, event types, mechanism values, and sentiment values MUST remain in English exactly as specified. Only the "insight" string content should be in Chinese.\n\n'
    : ''

  // Build previous day context block
  let previousBlock = ''
  if (previousInsights && previousInsights.size > 0) {
    const lines = withArticles
      .map(t => previousInsights.get(t.ticker))
      .filter(Boolean)
      .length > 0
      ? withArticles
          .filter(t => previousInsights.has(t.ticker))
          .map(t => `${t.ticker}: ${previousInsights.get(t.ticker)}`)
          .join('\n')
      : ''
    if (lines) {
      previousBlock = `\nPrevious day summaries (use for delta detection in steps 4-5):\n${lines}\n`
    }
  }

  const prompt = `${languageInstruction}You are an AI financial analyst predicting impact before price moves.
For each stock below, follow this analytical framework internally:

1. IDENTIFY KEY EVENTS — extract main events from articles, group articles covering the same event
2. INFER MECHANISMS — for each event determine impact on: revenue, costs, growth outlook, risk profile
3. DETERMINE SENTIMENT — bullish/neutral/bearish toward company's future outlook based on financial implications, NOT writing tone
4. DETECT NEW SIGNALS — compare with previous day summary (if provided): identify new risks or opportunities, disappearing themes, sentiment shifts
5. DETECT EARLY SIGNALS — flag if: a new risk appears, sentiment significantly shifts vs yesterday, news volume spikes on same event, multiple independent sources converge on same concern
6. GENERATE INSIGHT — 2-3 sentences: what changed, why it matters financially, what the market may not fully price in yet
${previousBlock}
Output ONLY a valid JSON array — no markdown fences, no commentary before or after:
[
  {
    "ticker": "AAPL",
    "citations": [1, 3],
    "events": ["regulation"],
    "mechanisms": { "revenue": "decrease", "costs": "unclear", "growth": "negative", "risk": "increase" },
    "sentiment": "bearish",
    "earlyWarnings": ["new_risk"],
    "insight": "..."
  }
]

Rules:
- events must be from: earnings, guidance_change, ma, regulation, product_launch, macro_impact, analyst_change, expansion, restructuring, other
- earlyWarnings must be from: new_risk, sentiment_shift, volume_spike, source_convergence
- mechanisms values: increase, decrease, unclear (growth uses: positive, negative, unclear)
- Earnings / financial results: always name the fiscal period (e.g. Q1 2026, FY2025) and include the key figure or surprise
- Always prefer concrete numbers over vague qualifiers — "fell 40%" not "declined sharply"
- If no meaningful news for a ticker: insight = "${fallbackPhrase}", events = [], earlyWarnings = [], all mechanisms = "unclear", sentiment = "neutral"
- Include ALL tickers listed below in your output, even those with no news

News:
${newsBlock}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  console.log('[anthropic] raw response:', text.slice(0, 500))

  // Parse JSON response
  let results: AnalysisResult[] = []
  try {
    const jsonStr = text.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim()
    results = JSON.parse(jsonStr)
  } catch (e1) {
    console.warn('[anthropic] Direct JSON parse failed, trying regex extraction:', (e1 as Error).message)
    // Fallback: try to extract JSON array from text
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        results = JSON.parse(match[0])
      } catch (e2) {
        console.error('[anthropic] Failed to parse JSON response:', (e2 as Error).message)
        console.error('[anthropic] Raw response was:', text)
      }
    } else {
      console.error('[anthropic] No JSON array found in response:', text)
    }
  }

  const resultMap = new Map<string, AnalysisResult>()
  for (const r of results) {
    if (r.ticker) resultMap.set(r.ticker, r)
  }

  const fallback = fallbackPhrase
  return tickerNews.map(t => {
    const r = resultMap.get(t.ticker)
    const insight = r?.insight ?? fallback
    const citedIndices = (r?.citations ?? []).map(n => n - 1)
    const sources = insight === fallback || citedIndices.length === 0
      ? []
      : citedIndices
          .filter(i => i >= 0 && i < t.articles.length)
          .map(i => ({ headline: t.articles[i].headline, url: t.articles[i].url }))
    const signal = r ? parseSignal(r) : undefined
    return { ticker: t.ticker, company: t.company, insight, sources, signal }
  })
}
