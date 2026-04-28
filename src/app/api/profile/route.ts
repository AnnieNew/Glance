import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { language, nickname } = body

  const updates: Record<string, unknown> = {}

  if (language !== undefined) {
    if (language !== 'en' && language !== 'zh') {
      return NextResponse.json({ error: 'language must be "en" or "zh"' }, { status: 400 })
    }
    updates.language = language
  }

  if (nickname !== undefined) {
    if (typeof nickname !== 'string' || nickname.trim().length === 0) {
      return NextResponse.json({ error: 'nickname must be a non-empty string' }, { status: 400 })
    }
    updates.nickname = nickname.trim()
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no valid fields to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
