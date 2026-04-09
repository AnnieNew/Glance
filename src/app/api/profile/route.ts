import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { language } = await request.json()
  if (language !== 'en' && language !== 'zh') {
    return NextResponse.json({ error: 'language must be "en" or "zh"' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ language })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
