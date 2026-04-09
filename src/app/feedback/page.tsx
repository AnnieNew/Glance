'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'

function FeedbackForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const ratingParam = searchParams.get('rating')

  const [rating, setRating] = useState<'good' | 'bad' | null>(
    ratingParam === 'good' || ratingParam === 'bad' ? ratingParam : null
  )
  const [comment, setComment] = useState('')
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'duplicate' | 'error'>('idle')

  useEffect(() => {
    if (!token) setState('error')
  }, [token])

  async function handleSubmit() {
    if (!rating || state !== 'idle') return
    setState('submitting')
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, rating, comment }),
    })
    if (res.ok) {
      setState('done')
    } else if (res.status === 409) {
      setState('duplicate')
    } else {
      setState('error')
    }
  }

  if (!token || state === 'error') {
    return (
      <div style={{ textAlign: 'center', paddingTop: '40px' }}>
        <p className="text-sm text-zinc-400">This link has expired or is invalid.</p>
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div style={{ textAlign: 'center', paddingTop: '40px' }}>
        <p className="text-2xl" style={{ marginBottom: '8px' }}>{rating === 'good' ? '👍' : '👎'}</p>
        <p className="text-sm font-medium">Thanks for your feedback!</p>
        <p className="text-sm text-zinc-400" style={{ marginTop: '4px' }}>It helps us make Glance better.</p>
      </div>
    )
  }

  if (state === 'duplicate') {
    return (
      <div style={{ textAlign: 'center', paddingTop: '40px' }}>
        <p className="text-sm text-zinc-400">We already received your feedback — thanks!</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '400px' }}>
      <h1 className="text-lg font-semibold" style={{ marginBottom: '4px' }}>How was today&apos;s digest?</h1>
      <p className="text-sm text-zinc-400" style={{ marginBottom: '24px' }}>Your feedback helps us improve.</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <Button
          variant={rating === 'good' ? 'primary' : 'ghost'}
          onClick={() => setRating('good')}
          style={{ fontSize: '18px', padding: '10px 20px' }}
        >
          👍
        </Button>
        <Button
          variant={rating === 'bad' ? 'primary' : 'ghost'}
          onClick={() => setRating('bad')}
          style={{ fontSize: '18px', padding: '10px 20px' }}
        >
          👎
        </Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label className="text-sm text-zinc-500" style={{ display: 'block', marginBottom: '6px' }}>
          Tell us more (optional)
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Help us improve"
          rows={4}
          className="text-sm text-zinc-800"
          style={{
            width: '100%',
            border: '1px solid #e4e4e7',
            borderRadius: '8px',
            padding: '10px 12px',
            resize: 'vertical',
            fontFamily: 'monospace',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <Button
        variant="primary"
        disabled={!rating || state === 'submitting'}
        onClick={handleSubmit}
      >
        {state === 'submitting' ? 'Sending…' : 'Send feedback'}
      </Button>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: 'monospace' }}>
      <header style={{ borderBottom: '1px solid #f4f4f5', padding: '16px 24px' }}>
        <span style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '-0.02em' }}>Glance.</span>
      </header>
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '48px 24px' }}>
        <Suspense fallback={null}>
          <FeedbackForm />
        </Suspense>
      </div>
    </main>
  )
}
