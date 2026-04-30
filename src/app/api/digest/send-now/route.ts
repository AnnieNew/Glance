import { runDigestForUser } from '@/lib/digest'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fire-and-forget — return immediately, let digest run in background
  runDigestForUser(user.id, 'manual').catch(err =>
    console.error(`Background digest failed for user ${user.id}:`, err)
  )
  return NextResponse.json({ ok: true })
}
