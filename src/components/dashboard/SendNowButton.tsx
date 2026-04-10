'use client'

import { useState, useEffect } from 'react'

interface Props {
  hasSubscriptions: boolean
}

type State = 'idle' | 'loading' | 'success' | 'error'

export default function SendNowButton({ hasSubscriptions }: Props) {
  const [state, setState] = useState<State>('idle')

  useEffect(() => {
    if (state !== 'success' && state !== 'error') return
    const t = setTimeout(() => setState('idle'), 3000)
    return () => clearTimeout(t)
  }, [state])

  async function handleClick() {
    setState('loading')
    try {
      const res = await fetch('/api/digest/send-now', { method: 'POST' })
      setState(res.ok ? 'success' : 'error')
    } catch {
      setState('error')
    }
  }

  const label =
    state === 'loading' ? 'Sending…' :
    state === 'success' ? 'Email sent ✓' :
    state === 'error'   ? 'Something went wrong' :
    'Send digest now'

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={handleClick}
        disabled={!hasSubscriptions || state === 'loading'}
        className="border border-border text-muted rounded-lg px-3 py-1.5 text-sm hover:border-border-strong hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {label}
      </button>
      {!hasSubscriptions && (
        <span className="text-[11px] text-muted-subtle">Add stocks first</span>
      )}
    </div>
  )
}
