import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { token, rating, comment } = await req.json()

  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
  if (rating !== 'good' && rating !== 'bad')
    return NextResponse.json({ error: 'rating must be "good" or "bad"' }, { status: 400 })

  const supabase = getAdminClient()

  const { data: log } = await supabase
    .from('digest_logs')
    .select('id')
    .eq('token', token)
    .single()

  if (!log) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

  const { error } = await supabase.from('feedback').insert({
    digest_log_id: log.id,
    rating,
    comment: comment?.trim() || null,
  })

  if (error?.code === '23505')
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
