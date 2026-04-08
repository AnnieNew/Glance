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
        <p className="text-sm text-zinc-700">Check your email to confirm your account.</p>
        <p className="text-xs text-zinc-400">
          Already confirmed?{' '}
          <Link href="/login" className="text-black underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm text-zinc-500 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm text-zinc-500 mb-1">
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
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors"
          placeholder="Min. 8 characters"
        />
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-center text-sm text-zinc-400">
        Already have an account?{' '}
        <Link href="/login" className="text-black underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  )
}
