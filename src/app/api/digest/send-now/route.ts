import { runDigestForUser } from '@/lib/digest'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await runDigestForUser(user.id, true)
  if (result === 'failed') return NextResponse.json({ error: 'Digest failed' }, { status: 500 })
  return NextResponse.json({ ok: true, result })
}
