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

export type EventType =
  | 'earnings' | 'guidance_change' | 'ma' | 'regulation'
  | 'product_launch' | 'macro_impact' | 'analyst_change'
  | 'expansion' | 'restructuring' | 'other'

export type MechanismImpact = 'increase' | 'decrease' | 'unclear'
export type Sentiment = 'bullish' | 'neutral' | 'bearish'
export type EarlyWarning = 'new_risk' | 'sentiment_shift' | 'volume_spike' | 'source_convergence'

export interface DigestSignal {
  events: EventType[]
  mechanisms: {
    revenue: MechanismImpact
    costs: MechanismImpact
    growth: 'positive' | 'negative' | 'unclear'
    risk: MechanismImpact
  }
  sentiment: Sentiment
  earlyWarnings: EarlyWarning[]
}

export interface DigestEntry {
  ticker: string
  company: string
  insight: string
  sources?: { headline: string; url: string }[]
  priceChange?: { price: number; change: number; changePercent: number }
  signal?: DigestSignal
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
