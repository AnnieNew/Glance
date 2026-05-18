import { getCompanyNews } from '@/lib/finnhub'
import { getCompanyNews as newsdataGetCompanyNews } from '@/lib/newsdata'
import { summarizeNewsForUser } from '@/lib/anthropic'
import { sendDigestEmail } from '@/lib/resend'
import { getAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, tickers, language } = body as {
    email: string
    tickers: { ticker: string; company: string }[]
    language?: 'en' | 'zh'
  }

  if (!email || !Array.isArray(tickers) || tickers.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const lang = language ?? 'en'
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const tickerNews = await Promise.all(
    tickers.slice(0, 5).map(async ({ ticker, company }) => {
      const finnhubArticles = await getCompanyNews(ticker, yesterday, today)
      const articles = finnhubArticles.length > 0
        ? finnhubArticles
        : await newsdataGetCompanyNews(ticker, company)
      return { ticker, company, articles }
    })
  )

  const entries = await summarizeNewsForUser(tickerNews, lang)

  const locale = lang === 'zh' ? 'zh-CN' : 'en-US'
  const dateLabel = new Date().toLocaleDateString(locale, {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  await sendDigestEmail(email, entries, dateLabel, lang, '', undefined)

  void getAdminClient()
    .from('guest_digest_logs')
    .insert({ email, ticker_count: entries.length, language: lang })

  return NextResponse.json({ ok: true })
}
