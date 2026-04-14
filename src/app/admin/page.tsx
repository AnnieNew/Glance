import { getAdminClient } from '@/lib/supabase/admin'
import Charts from './Charts'

export default async function AdminPage() {
  const supabase = getAdminClient()

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const fourteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [
    { count: userCount },
    { count: subscriptionCount },
    { data: todayDigests },
    { data: feedbackSummary },
    { data: recentSends },
    { data: historicalSends },
    { data: historicalFeedback },
    { data: allProfiles },
    { data: allSubscriptions },
    { data: tickerStats },
    { data: comments },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }),
    supabase
      .from('digest_logs')
      .select('source, status, sent_at')
      .gte('sent_at', `${today}T00:00:00`)
      .lte('sent_at', `${today}T23:59:59`),
    supabase.from('feedback').select('rating'),
    supabase
      .from('digest_logs')
      .select('id, sent_at, source, status, ticker_count, user_id, profiles(email), feedback(rating)')
      .order('sent_at', { ascending: false })
      .limit(30),
    supabase
      .from('digest_logs')
      .select('sent_at, status')
      .gte('sent_at', `${fourteenDaysAgo}T00:00:00`)
      .eq('status', 'sent'),
    supabase
      .from('feedback')
      .select('rating, created_at'),
    supabase.from('profiles').select('created_at').order('created_at', { ascending: true }),
    supabase.from('subscriptions').select('created_at').order('created_at', { ascending: true }),
    supabase
      .from('digest_logs')
      .select('sent_at, ticker_count')
      .gte('sent_at', `${fourteenDaysAgo}T00:00:00`)
      .eq('status', 'sent'),
    supabase
      .from('feedback')
      .select('rating, comment, created_at, digest_logs(sent_at, profiles(email))')
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  // Derived stats
  const sentToday = (todayDigests ?? []).filter(d => d.status === 'sent').length
  const cronLog = (todayDigests ?? []).find(d => d.source === 'cron' && d.status === 'sent')
  const goodCount = (feedbackSummary ?? []).filter(f => f.rating === 'good').length
  const badCount = (feedbackSummary ?? []).filter(f => f.rating === 'bad').length

  // Build last 14 days of daily send counts
  const sendsByDay = buildDailyChart(
    (historicalSends ?? []).map(r => r.sent_at),
    fourteenDaysAgo,
    today
  )

  // Build last 14 days of daily feedback counts
  const feedbackByDay = buildDailyFeedbackChart(
    (historicalFeedback ?? []) as { rating: string; created_at: string }[],
    fourteenDaysAgo,
    today
  )

  // Cumulative user + subscription growth (all time, by day)
  const growthByDay = buildGrowthChart(
    (allProfiles ?? []).map(r => r.created_at),
    (allSubscriptions ?? []).map(r => r.created_at)
  )

  // Average + max tickers per day (last 14 days)
  const tickersByDay = buildTickerChart(
    (tickerStats ?? []) as { sent_at: string; ticker_count: number }[],
    fourteenDaysAgo,
    today
  )

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <h1 className="text-xl font-semibold">Overview</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total users" value={userCount ?? 0} />
        <StatCard label="Total subscriptions" value={subscriptionCount ?? 0} />
        <StatCard label="Emails sent today" value={sentToday} />
        <StatCard
          label="Feedback"
          value={`${goodCount} 👍 / ${badCount} 👎`}
          valueClassName="text-lg"
        />
      </div>

      {/* Cron status banner */}
      {cronLog ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
          ✓ Cron ran today at {new Date(cronLog.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      ) : (
        <div style={{ background: '#fefce8', border: '1px solid #fde68a', color: '#92400e', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
          ⚠ Cron hasn&apos;t run today yet
        </div>
      )}

      {/* Charts */}
      <Charts
        sendsByDay={sendsByDay}
        feedbackByDay={feedbackByDay}
        growthByDay={growthByDay}
        tickersByDay={tickersByDay}
      />

      {/* User comments */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted uppercase tracking-wide">
          User comments ({(comments ?? []).length})
        </h2>
        <div className="border border-border rounded-lg overflow-y-auto" style={{ maxHeight: '320px' }}>
          {(comments ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">No comments yet</p>
          ) : (
            <ul className="divide-y divide-border">
              {(comments ?? []).map((c, i) => {
                const log = Array.isArray(c.digest_logs) ? c.digest_logs[0] : c.digest_logs
                const profile = log && (Array.isArray((log as {profiles?: unknown}).profiles) ? (log as {profiles: {email?: string}[]}).profiles[0] : (log as {profiles?: {email?: string}}).profiles)
                const email = (profile as { email?: string } | null)?.email ?? '—'
                return (
                  <li key={i} className="px-4 py-3 flex gap-3">
                    <span className="text-base leading-none pt-0.5">{c.rating === 'good' ? '👍' : '👎'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{c.comment}</p>
                      <p className="text-xs text-muted mt-1">
                        {email} · {new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Recent sends table */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted uppercase tracking-wide">Recent sends</h2>
        <div className="border border-border rounded-lg overflow-auto" style={{ maxHeight: '400px' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background sticky top-0">
                <th className="text-left px-4 py-2 text-muted font-medium">User</th>
                <th className="text-left px-4 py-2 text-muted font-medium">Sent at</th>
                <th className="text-left px-4 py-2 text-muted font-medium">Source</th>
                <th className="text-left px-4 py-2 text-muted font-medium">Tickers</th>
                <th className="text-left px-4 py-2 text-muted font-medium">Status</th>
                <th className="text-left px-4 py-2 text-muted font-medium">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {(recentSends ?? []).map((row, i) => {
                const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
                const feedback = Array.isArray(row.feedback) ? row.feedback[0] : row.feedback
                const email = (profile as { email?: string } | null)?.email ?? row.user_id
                const rating = (feedback as { rating?: string } | null)?.rating

                return (
                  <tr key={row.id} className={i % 2 === 1 ? 'bg-border/10' : ''}>
                    <td className="px-4 py-2 text-muted truncate max-w-[180px]">{email}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(row.sent_at).toLocaleString([], {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2">
                      <span className={row.source === 'manual' ? 'font-medium' : 'text-muted'}>
                        {row.source}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted">{row.ticker_count}</td>
                    <td className="px-4 py-2">
                      {row.status === 'sent' ? (
                        <span className="flex items-center gap-1">
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                          sent
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500">
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                          failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {rating === 'good' ? '👍' : rating === 'bad' ? '👎' : <span className="text-muted">—</span>}
                    </td>
                  </tr>
                )
              })}
              {(recentSends ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">No sends yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

// Build an array of { date, count } for the last 14 days
function buildDailyChart(timestamps: string[], from: string, to: string) {
  const days: { date: string; emails: number }[] = []
  const current = new Date(from)
  const end = new Date(to)

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10)
    const count = timestamps.filter(t => t.slice(0, 10) === dateStr).length
    days.push({ date: formatShortDate(dateStr), emails: count })
    current.setDate(current.getDate() + 1)
  }
  return days
}

function buildDailyFeedbackChart(
  rows: { rating: string; created_at: string }[],
  from: string,
  to: string
) {
  const days: { date: string; good: number; bad: number }[] = []
  const current = new Date(from)
  const end = new Date(to)

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10)
    const dayRows = rows.filter(r => r.created_at.slice(0, 10) === dateStr)
    days.push({
      date: formatShortDate(dateStr),
      good: dayRows.filter(r => r.rating === 'good').length,
      bad: dayRows.filter(r => r.rating === 'bad').length,
    })
    current.setDate(current.getDate() + 1)
  }
  return days
}

// Cumulative user + subscription growth, one point per day that had activity
function buildGrowthChart(userTimestamps: string[], subTimestamps: string[]) {
  const allDates = [
    ...userTimestamps.map(t => t.slice(0, 10)),
    ...subTimestamps.map(t => t.slice(0, 10)),
  ]
  if (allDates.length === 0) return []
  const uniqueDays = [...new Set(allDates)].sort()

  return uniqueDays.map(dateStr => {
    const users = userTimestamps.filter(t => t.slice(0, 10) <= dateStr).length
    const subscriptions = subTimestamps.filter(t => t.slice(0, 10) <= dateStr).length
    return { date: formatShortDate(dateStr), users, subscriptions }
  })
}

// Average + max ticker_count per day from digest_logs
function buildTickerChart(
  rows: { sent_at: string; ticker_count: number }[],
  from: string,
  to: string
) {
  const days: { date: string; avg: number; max: number }[] = []
  const current = new Date(from)
  const end = new Date(to)

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10)
    const dayRows = rows.filter(r => r.sent_at.slice(0, 10) === dateStr)
    const counts = dayRows.map(r => r.ticker_count)
    days.push({
      date: formatShortDate(dateStr),
      avg: counts.length > 0 ? Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10 : 0,
      max: counts.length > 0 ? Math.max(...counts) : 0,
    })
    current.setDate(current.getDate() + 1)
  }
  return days
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function StatCard({
  label,
  value,
  valueClassName = 'text-2xl',
}: {
  label: string
  value: string | number
  valueClassName?: string
}) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className={`${valueClassName} font-semibold`}>{value}</div>
      <div className="text-sm text-muted mt-1">{label}</div>
    </div>
  )
}
