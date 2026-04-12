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
    ? 'You MUST write every insight in Simplified Chinese (简体中文). Do not use English anywhere in your response.\n\n'
    : ''

  const prompt = `${languageInstruction}You are an AI analyst for busy investors. For each stock below, write exactly ONE sentence (max 25 words) capturing the single most logic-shifting piece of information — news that genuinely changes how a rational investor should think about this company. Focus on what matters: earnings surprises, leadership changes, regulatory shifts, product pivots, or macro impacts on this specific business. Ignore routine noise, minor price moves, and analyst upgrades/downgrades unless they are unusually significant.

If there is no meaningful news, write: "${fallbackPhrase}" with no citation.

Cite the article number(s) you used in square brackets immediately after the ticker. If you used multiple articles, list them comma-separated.

Format your response EXACTLY like this (one line per stock, no extra lines):
TICKER [1]: <insight>
TICKER [1,2]: <insight>
TICKER: ${fallbackPhrase}

News:
${newsBlock}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  // Parse "TICKER [1,2]: insight" or "TICKER: insight" lines
  const parsed = new Map<string, { insight: string; indices: number[] }>()
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z.]+)(?:\s*\[([0-9,\s]+)\])?:\s*(.+)$/)
    if (match) {
      const indices = match[2]
        ? match[2].split(',').map(s => parseInt(s.trim(), 10) - 1).filter(n => !isNaN(n))
        : []
      parsed.set(match[1], { insight: match[3].trim(), indices })
    }
  }

  const fallback = language === 'zh' ? '今日无重大进展。' : 'No significant developments today.'
  return tickerNews.map(t => {
    const entry = parsed.get(t.ticker)
    const insight = entry?.insight ?? fallback
    const citedIndices = entry?.indices ?? []
    const sources = insight === fallback || citedIndices.length === 0
      ? []
      : citedIndices
          .filter(i => i >= 0 && i < t.articles.length)
          .map(i => ({ headline: t.articles[i].headline, url: t.articles[i].url }))
    return { ticker: t.ticker, company: t.company, insight, sources }
  })
}
