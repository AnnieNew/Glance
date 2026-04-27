import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('paused')
    .eq('id', user.id)
    .single()

  const { data } = await supabase
    .from('profiles')
    .update({ paused: !profile?.paused })
    .eq('id', user.id)
    .select('paused')
    .single()

  return NextResponse.json({ paused: data?.paused })
}
