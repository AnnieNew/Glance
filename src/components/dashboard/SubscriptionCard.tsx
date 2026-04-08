'use client'

import { Subscription } from '@/types'

interface Props {
  subscription: Subscription
  onRemove: (ticker: string) => void
  removing: boolean
  pendingRemove?: boolean
  isPendingAdd?: boolean
}

export default function SubscriptionCard({
  subscription,
  onRemove,
  removing,
  pendingRemove,
  isPendingAdd,
}: Props) {
  return (
    <div className={`border rounded-lg px-4 py-3 flex items-center justify-between transition-colors ${
      pendingRemove
        ? 'border-zinc-100 bg-zinc-50 opacity-50'
        : 'border-zinc-200'
    }`}>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-sm">{subscription.ticker}</span>
          {isPendingAdd && (
            <span className="text-[10px] text-zinc-400 border border-zinc-200 rounded px-1 py-0.5 leading-none">
              unsaved
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400 mt-0.5 max-w-[180px] truncate">{subscription.company}</p>
      </div>

      {pendingRemove ? (
        <button
          onClick={() => onRemove(subscription.ticker)}
          className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors pl-3"
          aria-label={`Cancel removing ${subscription.ticker}`}
        >
          undo
        </button>
      ) : (
        <button
          onClick={() => onRemove(subscription.ticker)}
          disabled={removing}
          className="text-zinc-300 hover:text-zinc-700 transition-colors text-lg leading-none disabled:opacity-40 pl-3"
          aria-label={`Remove ${subscription.ticker}`}
        >
          ×
        </button>
      )}
    </div>
  )
}
