import Anthropic from '@anthropic-ai/sdk'
import { TickerNews, DigestEntry } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function summarizeNewsForUser(tickerNews: TickerNews[], language = 'en'): Promise<DigestEntry[]> {
  for (const t of tickerNews) {
    console.log(`[finnhub] ${t.ticker}: ${t.articles.length} article(s)`, t.articles.map(a => a.headline))
  }

  const withArticles = tickerNews.filter(t => t.articles.length > 0)
  if (withArticles.length === 0) {
    return tickerNews.map(t => ({
      ticker: t.ticker,
      company: t.company,
      insight: language === 'zh' ? '今日无重大进展。' : 'No significant developments today.',
    }))
  }

  const newsBlock = withArticles.map(t => {
    const articles = t.articles
      .map(a => `  - ${a.headline}${a.summary ? ': ' + a.summary.slice(0, 200) : ''}`)
      .join('\n')
    return `${t.ticker} (${t.company}):\n${articles}`
  }).join('\n\n')

  const languageInstruction = language === 'zh'
    ? '\nRespond in Simplified Chinese (简体中文). The fallback phrase should be "今日无重大进展。"'
    : ''

  const prompt = `You are an AI analyst for busy investors. For each stock below, write exactly ONE sentence (max 25 words) capturing the single most logic-shifting piece of information — news that genuinely changes how a rational investor should think about this company. Focus on what matters: earnings surprises, leadership changes, regulatory shifts, product pivots, or macro impacts on this specific business. Ignore routine noise, minor price moves, and analyst upgrades/downgrades unless they are unusually significant.

If there is no meaningful news, write: "No significant developments today."

Format your response EXACTLY like this (one line per stock, no extra lines):
TICKER: <insight>

News:
${newsBlock}${languageInstruction}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  // Parse "TICKER: insight" lines
  const parsed = new Map<string, string>()
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z.]+):\s*(.+)$/)
    if (match) parsed.set(match[1], match[2].trim())
  }

  return tickerNews.map(t => ({
    ticker: t.ticker,
    company: t.company,
    insight: parsed.get(t.ticker) ?? (language === 'zh' ? '今日无重大进展。' : 'No significant developments today.'),
  }))
}
