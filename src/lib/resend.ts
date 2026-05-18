import { Resend } from 'resend'
import { render } from '@react-email/components'
import DigestEmail from '@/components/email/DigestEmail'
import { DigestEntry } from '@/types'

function renderPlainText(entries: DigestEntry[], date: string, appUrl: string, language: string, token: string): string {
  const lines: string[] = []
  lines.push('Glance.')
  lines.push(date)
  lines.push('')

  for (const entry of entries) {
    lines.push(`${entry.ticker}  ${entry.company}`)
    if (entry.priceChange) {
      const sign = entry.priceChange.change >= 0 ? '+' : ''
      lines.push(`$${entry.priceChange.price.toFixed(2)}  ${sign}${entry.priceChange.change.toFixed(2)} (${sign}${entry.priceChange.changePercent.toFixed(2)}%)`)
    }
    lines.push(entry.insight)
    if (entry.sources?.length) {
      lines.push(entry.sources.map((s, i) => `[${i + 1}] ${s.url}`).join('\n'))
    }
    lines.push('')
  }

  lines.push('---')
  if (token) {
    lines.push(language === 'zh' ? `管理订阅：${appUrl}/dashboard` : `Manage your stocks: ${appUrl}/dashboard`)
    lines.push(language === 'zh' ? `取消订阅：${appUrl}/unsubscribe?token=${token}` : `Unsubscribe: ${appUrl}/unsubscribe?token=${token}`)
  } else {
    lines.push(language === 'zh' ? `这是您在 Glance 请求的一次性摘要。注册以获取每日推送：${appUrl}/login` : `This is a one-time digest you requested at Glance. Sign up for daily digests: ${appUrl}/login`)
  }

  return lines.join('\n')
}

export async function sendDigestEmail(to: string, entries: DigestEntry[], date: string, language = 'en', token = '', nickname?: string) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const html = await render(DigestEmail({ entries, date, appUrl, language, token, nickname }))
  const text = renderPlainText(entries, date, appUrl, language, token)

  const headers: Record<string, string> = token
    ? {
        'List-Unsubscribe': `<${appUrl}/unsubscribe?token=${token}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      }
    : {}

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    replyTo: 'hello@glance-app.net',
    to,
    subject: `Glance · ${date}`,
    html,
    text,
    headers,
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
  return data
}
