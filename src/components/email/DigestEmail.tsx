import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Hr,
  Link,
} from '@react-email/components'
import { DigestEntry } from '@/types'

interface Props {
  entries: DigestEntry[]
  date: string
  appUrl: string
}

export default function DigestEmail({ entries, date, appUrl }: Props) {
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
              </Text>
              {i < entries.length - 1 && (
                <Hr style={{ borderColor: '#f4f4f5', margin: '0 0 20px' }} />
              )}
            </div>
          ))}

          <Hr style={{ borderColor: '#f4f4f5', margin: '32px 0 16px' }} />
          <Text style={{ fontSize: '11px', color: '#a1a1aa', margin: 0 }}>
            Manage your stocks at{' '}
            <Link href={`${appUrl}/dashboard`} style={{ color: '#a1a1aa' }}>
              {appUrl}
            </Link>
            {' · '}
            <Link href={`${appUrl}/unsubscribe`} style={{ color: '#a1a1aa' }}>
              Unsubscribe
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
