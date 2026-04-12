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
