'use client'

import { useState, useEffect } from 'react'
import { Subscription } from '@/types'
import SubscriptionCard from './SubscriptionCard'
import StockSearch from './StockSearch'

interface Props {
  initialSubscriptions: Subscription[]
}

export default function SubscriptionList({ initialSubscriptions }: Props) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)
  const [pendingAdds, setPendingAdds] = useState<{ ticker: string; company: string }[]>([])
  const [pendingRemoves, setPendingRemoves] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const hasPending = pendingAdds.length > 0 || pendingRemoves.length > 0
  const pendingCount = pendingAdds.length + pendingRemoves.length

  // "Saved ✓" fades after 2s
  useEffect(() => {
    if (!savedAt) return
    const t = setTimeout(() => setSavedAt(null), 2000)
    return () => clearTimeout(t)
  }, [savedAt])

  function handleAdd(ticker: string, company: string) {
    if (
      subscriptions.some(s => s.ticker === ticker) ||
      pendingAdds.some(p => p.ticker === ticker)
    ) return
    setPendingAdds(prev => [...prev, { ticker, company }])
  }

  function handleRemove(ticker: string) {
    // Cancel a pending add
    if (pendingAdds.some(p => p.ticker === ticker)) {
      setPendingAdds(prev => prev.filter(p => p.ticker !== ticker))
      return
    }
    // Toggle pending remove for committed stocks
    setPendingRemoves(prev =>
      prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await Promise.all([
        ...pendingAdds.map(({ ticker, company }) =>
          fetch('/api/subscriptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, company }),
          })
        ),
        ...pendingRemoves.map(ticker =>
          fetch('/api/subscriptions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker }),
          })
        ),
      ])

      // Commit to local state
      setSubscriptions(prev => {
        const withoutRemoved = prev.filter(s => !pendingRemoves.includes(s.ticker))
        const added = pendingAdds.map((p, i) => ({
          id: `pending-${i}`,
          user_id: '',
          ticker: p.ticker,
          company: p.company,
          created_at: new Date().toISOString(),
        }))
        return [...added, ...withoutRemoved]
      })
      setPendingAdds([])
      setPendingRemoves([])
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    setPendingAdds([])
    setPendingRemoves([])
  }

  // All tickers that occupy a "slot" (prevents double-adding)
  const allCurrentTickers = [
    ...subscriptions.map(s => s.ticker),
    ...pendingAdds.map(p => p.ticker),
  ]

  const totalCount = subscriptions.length + pendingAdds.length - pendingRemoves.length

  return (
    <div className="space-y-6">
      <StockSearch
        onAdd={handleAdd}
        currentTickers={allCurrentTickers}
        atLimit={totalCount >= 20}
      />

      {subscriptions.length === 0 && pendingAdds.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">
          No stocks yet. Search above to add your first one.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pendingAdds.map(p => (
            <SubscriptionCard
              key={`add-${p.ticker}`}
              subscription={{ id: '', user_id: '', ticker: p.ticker, company: p.company, created_at: '' }}
              onRemove={handleRemove}
              removing={false}
              isPendingAdd
            />
          ))}
          {subscriptions.map(s => (
            <SubscriptionCard
              key={s.ticker}
              subscription={s}
              onRemove={handleRemove}
              removing={false}
              pendingRemove={pendingRemoves.includes(s.ticker)}
            />
          ))}
        </div>
      )}

      {/* Save bar */}
      {hasPending ? (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted">
            {pendingCount} unsaved {pendingCount === 1 ? 'change' : 'changes'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleDiscard}
              disabled={saving}
              className="border border-border text-muted rounded-lg px-3 py-1.5 text-sm hover:border-border-strong hover:text-foreground transition-colors disabled:opacity-50"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-foreground text-background rounded-lg px-3 py-1.5 text-sm hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-2 border-t border-border min-h-[36px]">
          {savedAt ? (
            <span className="text-xs text-muted">Saved ✓</span>
          ) : (
            totalCount > 0 && (
              <p className="text-xs text-muted">
                {totalCount}/20 stocks · digest sent daily at 7:00 AM UTC
              </p>
            )
          )}
        </div>
      )}
    </div>
  )
}
