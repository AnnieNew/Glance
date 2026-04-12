import { ImageResponse } from 'next/og'
import { getAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

type Entry = { ticker: string; company: string; insight: string }

function CardLayout({ entries, date }: { entries: Entry[]; date: string }) {
  const visible = entries.slice(0, 7)
  const overflow = entries.length - visible.length

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '2160px',
        height: '3840px',
        backgroundColor: '#ffffff',
        fontFamily: 'monospace',
        padding: '160px 144px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '128px' }}>
        <span style={{ fontSize: '96px', fontWeight: 'bold', color: '#09090b' }}>Glance.</span>
        <span style={{ fontSize: '48px', color: '#71717a', marginTop: '16px' }}>{date}</span>
      </div>

      {/* Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {visible.map((entry, i) => (
          <div
            key={entry.ticker}
            style={{
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: i < visible.length - 1 ? '72px' : '0',
              marginBottom: i < visible.length - 1 ? '72px' : '0',
              borderBottom: i < visible.length - 1 ? '2px solid #f4f4f5' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px', marginBottom: '20px' }}>
              <span style={{ fontSize: '52px', fontWeight: 'bold', color: '#09090b' }}>{entry.ticker}</span>
              <span style={{ fontSize: '44px', color: '#71717a' }}>{entry.company}</span>
            </div>
            <span style={{ fontSize: '44px', color: '#27272a', lineHeight: '1.6' }}>{entry.insight}</span>
          </div>
        ))}
        {overflow > 0 && (
          <span style={{ fontSize: '40px', color: '#a1a1aa', marginTop: '32px' }}>+{overflow} more</span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '96px' }}>
        <span style={{ fontSize: '40px', color: '#a1a1aa' }}>glance-app.net</span>
      </div>
    </div>
  )
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new Response('Missing token', { status: 400 })

  const supabase = getAdminClient()
  const { data: log } = await supabase
    .from('digest_logs')
    .select('entries, sent_at')
    .eq('token', token)
    .single()

  if (!log) return new Response('Not found', { status: 404 })

  const entries = (log.entries ?? []) as Entry[]
  const significant = entries.filter(
    e => e.insight !== 'No significant developments today.' && e.insight !== '今日无重大进展。'
  )
  const display = significant.length > 0 ? significant : entries

  const date = new Date(log.sent_at).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return new ImageResponse(<CardLayout entries={display} date={date} />, {
    width: 2160,
    height: 3840,
  })
}
