import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticker, company } = await request.json()
  if (!ticker || !company) {
    return NextResponse.json({ error: 'ticker and company are required' }, { status: 400 })
  }

  // Enforce 20-ticker limit
  const { count } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) >= 20) {
    return NextResponse.json({ error: 'Subscription limit reached (20 max)' }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({ user_id: user.id, ticker: ticker.toUpperCase(), company })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticker } = await request.json()
  if (!ticker) return NextResponse.json({ error: 'ticker is required' }, { status: 400 })

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('ticker', ticker.toUpperCase())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
