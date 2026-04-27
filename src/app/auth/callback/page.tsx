'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      router.replace('/login?error=auth_failed')
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        router.replace('/login?error=auth_failed')
      } else {
        router.replace('/dashboard')
      }
    })
  }, [router, searchParams])

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted">Signing you in…</p>
    </main>
  )
}
