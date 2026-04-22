import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Hr,
  Link,
} from '@react-email/components'
import { DigestEntry, DigestSignal } from '../../types'

interface Props {
  entries: DigestEntry[]
  date: string
  appUrl: string
  language?: string
  token?: string
}

const EVENT_LABELS: Record<string, Record<string, string>> = {
  en: {
    earnings: 'Earnings', guidance_change: 'Guidance', ma: 'M&A',
    regulation: 'Regulation', product_launch: 'Product', macro_impact: 'Macro',
    analyst_change: 'Analyst', expansion: 'Expansion', restructuring: 'Restructuring', other: 'News',
  },
  zh: {
    earnings: '财报', guidance_change: '指引', ma: '并购',
    regulation: '监管', product_launch: '产品', macro_impact: '宏观',
    analyst_change: '分析师', expansion: '扩张', restructuring: '重组', other: '新闻',
  },
}

const SENTIMENT_COLORS: Record<string, string> = {
  bullish: '#16a34a',
  bearish: '#dc2626',
  neutral: '#71717a',
}

const MECHANISM_ARROWS: Record<string, string> = {
  increase: '\u2191',  // ↑
  decrease: '\u2193',  // ↓
}

const WARNING_LABELS: Record<string, Record<string, string>> = {
  en: {
    new_risk: 'New Risk',
    sentiment_shift: 'Sentiment Shift',
    volume_spike: 'Volume Spike',
    source_convergence: 'Multi-Source',
  },
  zh: {
    new_risk: '新风险',
    sentiment_shift: '情绪转变',
    volume_spike: '关注度激增',
    source_convergence: '多源共识',
  },
}

function buildSignalLine(signal: DigestSignal, lang: string): string {
  const parts: string[] = []

  // Event type
  const labels = EVENT_LABELS[lang] ?? EVENT_LABELS.en
  if (signal.events.length > 0) {
    parts.push(signal.events.map(e => labels[e] ?? e).join(', '))
  }

  // Sentiment
  const sentimentLabel = lang === 'zh'
    ? { bullish: '看多', bearish: '看空', neutral: '中性' }[signal.sentiment] ?? signal.sentiment
    : signal.sentiment.charAt(0).toUpperCase() + signal.sentiment.slice(1)
  parts.push(sentimentLabel)

  // Mechanism arrows (only non-unclear)
  const m = signal.mechanisms
  const mechParts: string[] = []
  const mechLabels = lang === 'zh'
    ? { revenue: '营收', costs: '成本', growth: '增长', risk: '风险' }
    : { revenue: 'Revenue', costs: 'Costs', growth: 'Growth', risk: 'Risk' }
  if (m.revenue !== 'unclear') mechParts.push(`${mechLabels.revenue}${MECHANISM_ARROWS[m.revenue] ?? ''}`)
  if (m.costs !== 'unclear') mechParts.push(`${mechLabels.costs}${MECHANISM_ARROWS[m.costs] ?? ''}`)
  if (m.growth !== 'unclear') {
    const arrow = m.growth === 'positive' ? '\u2191' : '\u2193'
    mechParts.push(`${mechLabels.growth}${arrow}`)
  }
  if (m.risk !== 'unclear') mechParts.push(`${mechLabels.risk}${MECHANISM_ARROWS[m.risk] ?? ''}`)
  if (mechParts.length > 0) parts.push(mechParts.join(' '))

  return parts.join(' \u00b7 ')  // joined by " · "
}

function buildWarningLine(signal: DigestSignal, lang: string): string {
  if (signal.earlyWarnings.length === 0) return ''
  const labels = WARNING_LABELS[lang] ?? WARNING_LABELS.en
  return signal.earlyWarnings.map(w => `\u26a0 ${labels[w] ?? w}`).join('  ')  // ⚠
}

const PREVIEW_ENTRIES: DigestEntry[] = [
  {
    ticker: 'AAPL',
    company: 'Apple Inc.',
    insight: 'Stronger-than-expected iPhone demand in China offsets near-term tariff headwinds. Services revenue hit record $26B, up 14% YoY. Market may underestimate resilience of China recovery.',
    signal: {
      events: ['earnings'],
      mechanisms: { revenue: 'increase', costs: 'unclear', growth: 'positive', risk: 'decrease' },
      sentiment: 'bullish',
      earlyWarnings: [],
    },
  },
  {
    ticker: 'NVDA',
    company: 'NVIDIA Corporation',
    insight: 'New export controls on H20 chips risk $5B in near-term China revenue. China accounts for 25% of datacenter GPU revenue, making this a direct margin headwind.',
    signal: {
      events: ['regulation'],
      mechanisms: { revenue: 'decrease', costs: 'unclear', growth: 'negative', risk: 'increase' },
      sentiment: 'bearish',
      earlyWarnings: ['new_risk'],
    },
  },
  {
    ticker: 'TSLA',
    company: 'Tesla Inc.',
    insight: 'European deliveries fell 49% YoY in March, raising demand concern beyond CEO friction. Margin pressure intensifying as price cuts fail to sustain volume.',
    signal: {
      events: ['macro_impact'],
      mechanisms: { revenue: 'decrease', costs: 'unclear', growth: 'negative', risk: 'increase' },
      sentiment: 'bearish',
      earlyWarnings: ['sentiment_shift', 'source_convergence'],
    },
  },
]

const FONT = 'Calibri, Trebuchet MS, sans-serif'

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
      <Body style={{ backgroundColor: '#ffffff', fontFamily: FONT, margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '520px', margin: '0 auto', padding: '40px 20px', fontFamily: FONT }}>
          <Text style={{ fontFamily: FONT, fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px' }}>
            Glance.
          </Text>
          <Text style={{ fontFamily: FONT, fontSize: '12px', color: '#71717a', margin: '0 0 32px' }}>
            {date}
          </Text>

          {entries.map((entry, i) => (
            <div key={entry.ticker}>
              <Text style={{ fontFamily: FONT, margin: '0 0 2px', fontSize: '13px', fontWeight: 'bold' }}>
                {entry.ticker}
                <span style={{ fontWeight: 'normal', color: '#71717a', marginLeft: '8px', fontSize: '12px' }}>
                  {entry.company}
                </span>
                {entry.priceChange && (
                  <span style={{ fontWeight: 'normal', marginLeft: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#71717a' }}>${entry.priceChange.price.toFixed(2)}</span>
                    <span style={{
                      color: entry.priceChange.change >= 0 ? '#16a34a' : '#dc2626',
                      marginLeft: '6px',
                    }}>
                      {entry.priceChange.change >= 0 ? '+' : ''}{entry.priceChange.change.toFixed(2)}{' '}
                      ({entry.priceChange.change >= 0 ? '+' : ''}{entry.priceChange.changePercent.toFixed(2)}%)
                    </span>
                  </span>
                )}
              </Text>
              <Text style={{ fontFamily: FONT, margin: '0 0 6px', fontSize: '13px', color: '#27272a', lineHeight: '1.6' }}>
                {entry.insight}
                {entry.sources && entry.sources.map((s, si) => (
                  <span key={si}>
                    {' '}
                    <Link href={s.url} style={{ color: '#a1a1aa', fontSize: '11px', textDecoration: 'none' }}>
                      [{si + 1}]
                    </Link>
                  </span>
                ))}
              </Text>
              {entry.signal && (
                <Text style={{ fontFamily: FONT, margin: '0 0 2px', fontSize: '11px', color: '#a1a1aa', lineHeight: '1.4' }}>
                  <span style={{ color: SENTIMENT_COLORS[entry.signal.sentiment] ?? '#71717a' }}>
                    {buildSignalLine(entry.signal, language)}
                  </span>
                </Text>
              )}
              {entry.signal && buildWarningLine(entry.signal, language) && (
                <Text style={{ fontFamily: FONT, margin: '0 0 2px', fontSize: '11px', color: '#d97706', lineHeight: '1.4' }}>
                  {buildWarningLine(entry.signal, language)}
                </Text>
              )}
              <div style={{ marginBottom: '14px' }} />
              {i < entries.length - 1 && (
                <Hr style={{ borderColor: '#f4f4f5', margin: '0 0 20px' }} />
              )}
            </div>
          ))}

          <Hr style={{ borderColor: '#f4f4f5', margin: '32px 0 16px' }} />
          {token && (
            <Text style={{ fontFamily: FONT, fontSize: '11px', color: '#a1a1aa', margin: '0 0 8px' }}>
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
              {'  ·  '}
              <Link href={`${appUrl}/share?token=${token}&lang=${language}`} style={{ color: '#a1a1aa' }}>
                {language === 'zh' ? '分享今日亮点' : 'Share highlights'}
              </Link>
            </Text>
          )}
          <Text style={{ fontFamily: FONT, fontSize: '11px', color: '#a1a1aa', margin: 0 }}>
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
