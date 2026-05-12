const BASE = 'https://finnhub.io/api/v1'
const KEY = process.env.FINNHUB_API_KEY!

export async function searchSymbols(query: string) {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&token=${KEY}`)
  if (!res.ok) throw new Error('Finnhub search failed')
  const data = await res.json()

  return (data.result ?? [])
    .filter((item: { type: string }) => item.type === 'Common Stock')
    .slice(0, 8)
    .map((item: { symbol: string; description: string }) => ({
      ticker: item.symbol,
      company: item.description,
    }))
}

export async function getQuote(ticker: string): Promise<{ price: number; change: number; changePercent: number } | null> {
  const res = await fetch(`${BASE}/quote?symbol=${ticker}&token=${KEY}`)
  if (!res.ok) return null
  const data = await res.json()
  if (!data || data.c === 0) return null
  return { price: data.c, change: data.d, changePercent: data.dp }
}

export async function getHistoricalClose(ticker: string, date: Date): Promise<number | null> {
  // Search a 4-day window starting at date to handle weekends/holidays
  const from = Math.floor(date.getTime() / 1000)
  const to = Math.floor((date.getTime() + 4 * 24 * 60 * 60 * 1000) / 1000)
  const res = await fetch(`${BASE}/stock/candle?symbol=${ticker}&resolution=D&from=${from}&to=${to}&token=${KEY}`)
  if (!res.ok) return null
  const data = await res.json()
  if (data.s !== 'ok' || !Array.isArray(data.c) || data.c.length === 0) return null
  return data.c[0] // first available close on or after date
}

export async function getCompanyNews(ticker: string, from: string, to: string) {
  const res = await fetch(
    `${BASE}/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${KEY}`
  )
  if (!res.ok) return []
  const data = await res.json()

  return (data as Array<{
    headline: string
    summary: string
    datetime: number
    source: string
    url: string
  }>)
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 3)
}
