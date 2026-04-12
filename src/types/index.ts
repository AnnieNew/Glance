export interface Subscription {
  id: string
  user_id: string
  ticker: string
  company: string
  created_at: string
}

export interface StockSearchResult {
  ticker: string
  company: string
}

export interface DigestEntry {
  ticker: string
  company: string
  insight: string
  sources?: { headline: string; url: string }[]
}

export interface TickerNews {
  ticker: string
  company: string
  articles: {
    headline: string
    summary: string
    datetime: number
    source: string
    url: string
  }[]
}
