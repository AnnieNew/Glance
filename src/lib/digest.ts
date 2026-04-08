import pLimit from 'p-limit'
import { getCompanyNews } from './finnhub'
import { summarizeNewsForUser } from './anthropic'
import { sendDigestEmail } from './resend'
import { TickerNews } from '@/types'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Uses service role key to read all users — bypasses RLS
function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function todayDateString() {
  return new Date().toISOString().split('T')[0] // e.g. "2026-04-07"
}

function yesterdayDateString() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export async function runDailyDigest() {
  const supabase = getAdminClient()
  const today = todayDateString()
  const yesterday = yesterdayDateString()

  // Get all distinct users who have subscriptions
  const { data: subRows, error: subErr } = await supabase
    .from('subscriptions')
    .select('user_id')

  if (subErr) throw subErr

  const userIds = [...new Set((subRows ?? []).map(r => r.user_id))]

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const userId of userIds) {
    try {
      // Check if already sent today
      const { data: logs } = await supabase
        .from('digest_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('sent_at', `${today}T00:00:00Z`)
        .lte('sent_at', `${today}T23:59:59Z`)
        .limit(1)

      if (logs && logs.length > 0) {
        skipped++
        continue
      }

      // Get user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single()

      if (!profile?.email) { skipped++; continue }

      // Get their subscriptions
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('ticker, company')
        .eq('user_id', userId)

      if (!subs || subs.length === 0) { skipped++; continue }

      // Fetch news for each ticker (rate-limited to 8 concurrent)
      const limit = pLimit(8)
      const tickerNews: TickerNews[] = await Promise.all(
        subs.map(s =>
          limit(async () => {
            const articles = await getCompanyNews(s.ticker, yesterday, today)
            return { ticker: s.ticker, company: s.company, articles }
          })
        )
      )

      // Summarize with Claude (one call per user)
      const entries = await summarizeNewsForUser(tickerNews)
      if (entries.length === 0) { skipped++; continue }

      // Send email
      const dateLabel = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      })
      await sendDigestEmail(profile.email, entries, dateLabel)

      await supabase.from('digest_logs').insert({
        user_id: userId,
        ticker_count: entries.length,
        status: 'sent',
      })

      sent++
    } catch (err) {
      console.error(`Digest failed for user ${userId}:`, err)
      try {
        await supabase.from('digest_logs').insert({
          user_id: userId,
          ticker_count: 0,
          status: 'failed',
        })
      } catch { /* ignore log failure */ }
      failed++
    }
  }

  return { sent, skipped, failed }
}
