import { createClient } from '@/lib/supabase/server'
import { searchSymbols } from '@/lib/finnhub'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 1) return NextResponse.json([])

  try {
    const results = await searchSymbols(q)
    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
