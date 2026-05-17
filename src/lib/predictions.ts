import { getAdminClient } from './supabase/admin'
import { getQuote } from './finnhub'
import { DigestEntry } from '@/types'

export async function insertPredictions(logId: string, entries: DigestEntry[], sentAt: Date) {
  const rows = entries
    .filter(e => (e.signal?.sentiment === 'bullish' || e.signal?.sentiment === 'bearish') && e.priceChange)
    .map(e => ({
      digest_log_id: logId,
      ticker: e.ticker,
      sentiment: e.signal!.sentiment,
      sent_at: sentAt.toISOString(),
      price_at_send: e.priceChange!.price,
    }))

  if (rows.length === 0) return

  await getAdminClient()
    .from('prediction_outcomes')
    .upsert(rows, { onConflict: 'digest_log_id,ticker' })
}

export async function evaluatePendingPredictions() {
  const supabase = getAdminClient()
  const now = Date.now()

  // Fetch all rows with any missing close
  const { data: pending } = await supabase
    .from('prediction_outcomes')
    .select('id, ticker, sent_at, t1_close, t3_close, t5_close')
    .or('t1_close.is.null,t3_close.is.null,t5_close.is.null')

  if (!pending || pending.length === 0) return

  const DAYS = [1, 3, 5] as const
  const MS_PER_DAY = 24 * 60 * 60 * 1000

  await Promise.all(
    pending.map(async row => {
      const sentAt = new Date(row.sent_at).getTime()
      const update: Record<string, number | null> = {}

      for (const n of DAYS) {
        const key = `t${n}_close` as 't1_close' | 't3_close' | 't5_close'
        if (row[key] !== null) continue // already evaluated
        const targetTime = sentAt + n * MS_PER_DAY
        if (now < targetTime) continue // not yet time to evaluate
        const quote = await getQuote(row.ticker)
        update[key] = quote?.price ?? null
      }

      if (Object.keys(update).length > 0) {
        await supabase.from('prediction_outcomes').update(update).eq('id', row.id)
      }
    })
  )
}
