const KEY = process.env.NEWSDATA_API_KEY ?? ''
const BASE = 'https://newsdata.io/api/1/news'

type Article = {
  headline: string
  summary: string
  datetime: number
  source: string
  url: string
}

export async function getCompanyNews(ticker: string, company: string): Promise<Article[]> {
  if (!KEY) return []
  const q = encodeURIComponent(`${ticker} ${company}`)
  const res = await fetch(`${BASE}?apikey=${KEY}&q=${q}&language=en&size=3`)
  if (!res.ok) {
    console.warn(`[newsdata] ${ticker}: HTTP ${res.status}`)
    return []
  }
  const data = await res.json()
  if (!Array.isArray(data?.results)) {
    console.warn(`[newsdata] ${ticker}: unexpected response`, data?.message ?? data)
    return []
  }
  const articles = data.results
    .filter((r: { link?: string }) => r.link)
    .slice(0, 3)
    .map((r: { title?: string; description?: string; pubDate?: string; source_id?: string; link: string }) => ({
      headline: r.title ?? '',
      summary: r.description ?? '',
      datetime: r.pubDate ? Math.floor(new Date(r.pubDate).getTime() / 1000) : 0,
      source: r.source_id ?? '',
      url: r.link,
    }))
  console.log(`[newsdata] ${ticker}: ${articles.length} article(s) fetched`)
  return articles
}
