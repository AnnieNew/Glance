import { Resend } from 'resend'
import { render } from '@react-email/components'
import DigestEmail from '@/components/email/DigestEmail'
import { DigestEntry } from '@/types'

export async function sendDigestEmail(to: string, entries: DigestEntry[], date: string, language = 'en', token = '') {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const html = await render(DigestEmail({ entries, date, appUrl, language, token }))

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Glance · ${date}`,
    html,
    headers: {
      'List-Unsubscribe': `<${appUrl}/unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
  return data
}
