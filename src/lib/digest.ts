import pLimit from 'p-limit'
import { getCompanyNews, getQuote } from './finnhub'
import { summarizeNewsForUser } from './anthropic'
import { sendDigestEmail } from './resend'
import { TickerNews, DigestEntry } from '@/types'
import { getAdminClient } from './supabase/admin'

function todayDateString() {
  return new Date().toISOString().split('T')[0] // e.g. "2026-04-07"
}

function yesterdayDateString() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export async function runDigestForUser(userId: string, source: 'cron' | 'manual' = 'cron'): Promise<'sent' | 'skipped' | 'failed'> {
  const supabase = getAdminClient()
  const today = todayDateString()
  const yesterday = yesterdayDateString()

  try {
    if (source === 'cron') {
      const { data: logs } = await supabase
        .from('digest_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('source', 'cron')
        .gte('sent_at', `${today}T00:00:00Z`)
        .lte('sent_at', `${today}T23:59:59Z`)
        .limit(1)
      if (logs && logs.length > 0) return 'skipped'
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, language')
      .eq('id', userId)
      .single()

    if (!profile?.email) return 'skipped'

    const language = profile.language ?? 'en'

    const { data: subs } = await supabase
      .from('subscriptions')
      .select('ticker, company')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) return 'skipped'

    // Fetch news + quote for each ticker (rate-limited to 8 concurrent)
    const limit = pLimit(8)
    const quoteMap = new Map<string, { price: number; change: number; changePercent: number } | null>()
    const tickerNews: TickerNews[] = await Promise.all(
      subs.map(s =>
        limit(async () => {
          const [articles, quote] = await Promise.all([
            getCompanyNews(s.ticker, yesterday, today),
            getQuote(s.ticker),
          ])
          quoteMap.set(s.ticker, quote)
          return { ticker: s.ticker, company: s.company, articles }
        })
      )
    )

    // Summarize with Claude (one call per user)
    const rawEntries = await summarizeNewsForUser(tickerNews, language)
    const entries = rawEntries.map(e => ({
      ...e,
      priceChange: quoteMap.get(e.ticker) ?? undefined,
    }))

    // Send email
    const locale = language === 'zh' ? 'zh-CN' : 'en-US'
    const dateLabel = new Date().toLocaleDateString(locale, {
      weekday: 'long', year: language === 'zh' ? 'numeric' : undefined,
      month: 'long', day: 'numeric',
    })
    const { data: logRow } = await supabase
      .from('digest_logs')
      .insert({ user_id: userId, ticker_count: entries.length, status: 'sent', source, entries })
      .select('token')
      .single()

    await sendDigestEmail(profile.email, entries, dateLabel, language, logRow?.token ?? '')

    return 'sent'
  } catch (err) {
    console.error(`Digest failed for user ${userId}:`, err)
    try {
      await getAdminClient().from('digest_logs').insert({
        user_id: userId,
        ticker_count: 0,
        status: 'failed',
        source,
      })
    } catch { /* ignore log failure */ }
    return 'failed'
  }
}

interface UserRecord {
  userId: string
  email: string
  language: 'en' | 'zh'
  tickers: { ticker: string; company: string }[]
}

export async function runDailyDigest() {
  const supabase = getAdminClient()
  const today = todayDateString()
  const yesterday = yesterdayDateString()

  // Phase 1: 3 parallel DB queries
  const [subsResult, profilesResult, logsResult] = await Promise.all([
    supabase.from('subscriptions').select('user_id, ticker, company'),
    supabase.from('profiles').select('id, email, language'),
    supabase.from('digest_logs').select('user_id')
      .eq('source', 'cron')
      .gte('sent_at', `${today}T00:00:00Z`)
      .lte('sent_at', `${today}T23:59:59Z`),
  ])

  if (subsResult.error) throw subsResult.error
  if (profilesResult.error) throw profilesResult.error

  const subRows = subsResult.data ?? []
  const profileRows = profilesResult.data ?? []
  const logRows = logsResult.data ?? []

  // Phase 2: Filter users, split by language
  const profileMap = new Map(
    profileRows.map(p => [p.id, { email: p.email as string, language: (p.language ?? 'en') as 'en' | 'zh' }])
  )
  const alreadySent = new Set(logRows.map(r => r.user_id))

  const subsByUser = new Map<string, { ticker: string; company: string }[]>()
  for (const row of subRows) {
    const list = subsByUser.get(row.user_id) ?? []
    list.push({ ticker: row.ticker, company: row.company })
    subsByUser.set(row.user_id, list)
  }

  const activeUsers: UserRecord[] = []
  for (const [userId, tickers] of subsByUser) {
    if (alreadySent.has(userId)) continue
    const profile = profileMap.get(userId)
    if (!profile?.email) continue
    activeUsers.push({ userId, email: profile.email, language: profile.language, tickers })
  }

  const totalUsersWithSubs = new Set(subRows.map(r => r.user_id)).size

  if (activeUsers.length === 0) {
    return { sent: 0, skipped: totalUsersWithSubs, failed: 0 }
  }

  const tickersByLang: Record<'en' | 'zh', Map<string, string>> = { en: new Map(), zh: new Map() }
  for (const user of activeUsers) {
    for (const { ticker, company } of user.tickers) {
      tickersByLang[user.language].set(ticker, company)
    }
  }

  // Global unique ticker set (union across both language groups)
  const globalTickerMap = new Map<string, string>()
  for (const lang of ['en', 'zh'] as const) {
    for (const [ticker, company] of tickersByLang[lang]) {
      globalTickerMap.set(ticker, company)
    }
  }

  // Phase 3a: Fetch Finnhub news + quote once per unique ticker
  const finnhubLimit = pLimit(8)
  const newsMap = new Map<string, TickerNews>()
  const quoteMap = new Map<string, { price: number; change: number; changePercent: number } | null>()
  await Promise.all(
    [...globalTickerMap.entries()].map(([ticker, company]) =>
      finnhubLimit(async () => {
        const [articles, quote] = await Promise.all([
          getCompanyNews(ticker, yesterday, today),
          getQuote(ticker),
        ])
        newsMap.set(ticker, { ticker, company, articles })
        quoteMap.set(ticker, quote)
      })
    )
  )

  // Phase 3b: Call Claude once per language group
  const insightMap = new Map<string, DigestEntry>() // key: `${ticker}:${language}`
  await Promise.all(
    (['en', 'zh'] as const)
      .filter(lang => tickersByLang[lang].size > 0)
      .map(async lang => {
        const tickerNewsBatch: TickerNews[] = [...tickersByLang[lang].keys()]
          .map(ticker => newsMap.get(ticker)!)
          .filter(Boolean)
        const entries = await summarizeNewsForUser(tickerNewsBatch, lang)
        for (const e of entries) insightMap.set(`${e.ticker}:${lang}`, e)
      })
  )

  // Phase 4: Send per-user emails (max 10 concurrent)
  let sent = 0
  let skipped = 0
  let failed = 0

  const emailLimit = pLimit(10)
  await Promise.all(
    activeUsers.map(user =>
      emailLimit(async () => {
        try {
          const entries: DigestEntry[] = user.tickers.reduce<DigestEntry[]>((acc, { ticker }) => {
            const e = insightMap.get(`${ticker}:${user.language}`)
            if (e) acc.push({ ...e, priceChange: quoteMap.get(ticker) ?? undefined })
            return acc
          }, [])

          if (entries.length === 0) { skipped++; return }

          const locale = user.language === 'zh' ? 'zh-CN' : 'en-US'
          const dateLabel = new Date().toLocaleDateString(locale, {
            weekday: 'long', year: user.language === 'zh' ? 'numeric' : undefined,
            month: 'long', day: 'numeric',
          })

          const { data: logRow, error: logErr } = await supabase
            .from('digest_logs')
            .insert({ user_id: user.userId, ticker_count: entries.length, status: 'sent', source: 'cron', entries })
            .select('token')
            .single()

          if (logErr) throw logErr

          await sendDigestEmail(user.email, entries, dateLabel, user.language, logRow?.token ?? '')
          sent++
        } catch (err) {
          console.error(`Digest failed for user ${user.userId}:`, err)
          try {
            await supabase.from('digest_logs').insert({
              user_id: user.userId, ticker_count: 0, status: 'failed', source: 'cron',
            })
          } catch { /* ignore log failure */ }
          failed++
        }
      })
    )
  )

  skipped += totalUsersWithSubs - activeUsers.length - failed

  return { sent, skipped, failed }
}
