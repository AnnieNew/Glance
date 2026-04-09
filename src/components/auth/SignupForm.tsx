'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm text-foreground">Check your email to confirm your account.</p>
        <p className="text-xs text-muted">
          Already confirmed?{' '}
          <Link href="/login" className="text-foreground underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm text-muted mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-border-strong transition-colors bg-background text-foreground"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm text-muted mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-border-strong transition-colors bg-background text-foreground"
          placeholder="Min. 8 characters"
        />
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-foreground text-background rounded-lg px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  )
}
