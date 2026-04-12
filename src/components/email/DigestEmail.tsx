import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Hr,
  Link,
} from '@react-email/components'
import { DigestEntry } from '../../types'

interface Props {
  entries: DigestEntry[]
  date: string
  appUrl: string
  language?: string
  token?: string
}

const PREVIEW_ENTRIES = [
  {
    ticker: 'AAPL',
    company: 'Apple Inc.',
    insight: 'Stronger-than-expected iPhone demand in China offsets near-term tariff headwinds.',
  },
  {
    ticker: 'NVDA',
    company: 'NVIDIA Corporation',
    insight: 'New export controls on H20 chips risk $5B in near-term China revenue.',
  },
  {
    ticker: 'TSLA',
    company: 'Tesla Inc.',
    insight: 'European deliveries fell 49% YoY in March, raising demand concern beyond CEO friction.',
  },
]

export default function DigestEmail({
  entries = PREVIEW_ENTRIES,
  date = 'Tuesday, April 8, 2025',
  appUrl = 'https://glance.app',
  language = 'en',
  token = '',
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'monospace', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '520px', margin: '0 auto', padding: '40px 20px' }}>
          <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px' }}>
            Glance.
          </Text>
          <Text style={{ fontSize: '12px', color: '#71717a', margin: '0 0 32px' }}>
            {date}
          </Text>

          {entries.map((entry, i) => (
            <div key={entry.ticker}>
              <Text style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 'bold' }}>
                {entry.ticker}
                <span style={{ fontWeight: 'normal', color: '#71717a', marginLeft: '8px', fontSize: '12px' }}>
                  {entry.company}
                </span>
              </Text>
              <Text style={{ margin: '0 0 20px', fontSize: '13px', color: '#27272a', lineHeight: '1.6' }}>
                {entry.insight}
                {entry.sources && entry.sources.map((s, i) => (
                  <span key={i}>
                    {' '}
                    <Link href={s.url} style={{ color: '#a1a1aa', fontSize: '11px', textDecoration: 'none' }}>
                      [{i + 1}]
                    </Link>
                  </span>
                ))}
              </Text>
              {i < entries.length - 1 && (
                <Hr style={{ borderColor: '#f4f4f5', margin: '0 0 20px' }} />
              )}
            </div>
          ))}

          <Hr style={{ borderColor: '#f4f4f5', margin: '32px 0 16px' }} />
          {token && (
            <Text style={{ fontSize: '11px', color: '#a1a1aa', margin: '0 0 8px' }}>
              {language === 'zh' ? '今日摘要如何？' : "How was today's digest?"}{' '}
              <Link href={`${appUrl}/feedback?token=${token}&rating=good`} style={{ color: '#27272a', fontWeight: 'bold', textDecoration: 'none' }}>
                👍
              </Link>
              {'  '}
              <Link href={`${appUrl}/feedback?token=${token}&rating=bad`} style={{ color: '#27272a', fontWeight: 'bold', textDecoration: 'none' }}>
                👎
              </Link>
              {'  ·  '}
              <Link href={`${appUrl}/feedback?token=${token}`} style={{ color: '#a1a1aa' }}>
                {language === 'zh' ? '留下反馈' : 'Leave feedback'}
              </Link>
            </Text>
          )}
          <Text style={{ fontSize: '11px', color: '#a1a1aa', margin: 0 }}>
            {language === 'zh' ? '管理您的股票订阅：' : 'Manage your stocks at'}{' '}
            <Link href={`${appUrl}/dashboard`} style={{ color: '#a1a1aa' }}>
              {appUrl}
            </Link>
            {' · '}
            <Link href={`${appUrl}/unsubscribe`} style={{ color: '#a1a1aa' }}>
              {language === 'zh' ? '取消订阅' : 'Unsubscribe'}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
