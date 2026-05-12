'use client'

import { useState } from 'react'

interface PredictionRow {
  sentiment: 'bullish' | 'bearish'
  price_at_send: number
  t1_close: number | null
  t3_close: number | null
  t5_close: number | null
}

interface Props {
  predictions: PredictionRow[]
}

type Window = 1 | 3 | 5

function calcAccuracy(rows: PredictionRow[], window: Window, threshold: number) {
  const key = `t${window}_close` as 't1_close' | 't3_close' | 't5_close'
  const evaluated = rows.filter(r => r[key] !== null)
  if (evaluated.length === 0) return null

  let correct = 0
  for (const r of evaluated) {
    const changePct = ((r[key]! - r.price_at_send) / r.price_at_send) * 100
    const isCorrect =
      (r.sentiment === 'bullish' && changePct > threshold) ||
      (r.sentiment === 'bearish' && changePct < -threshold)
    if (isCorrect) correct++
  }

  const bullish = evaluated.filter(r => r.sentiment === 'bullish')
  const bearish = evaluated.filter(r => r.sentiment === 'bearish')

  const bullishCorrect = bullish.filter(r => {
    const changePct = ((r[key]! - r.price_at_send) / r.price_at_send) * 100
    return changePct > threshold
  }).length

  const bearishCorrect = bearish.filter(r => {
    const changePct = ((r[key]! - r.price_at_send) / r.price_at_send) * 100
    return changePct < -threshold
  }).length

  return {
    overall: Math.round((correct / evaluated.length) * 100),
    bullish: bullish.length > 0 ? Math.round((bullishCorrect / bullish.length) * 100) : null,
    bearish: bearish.length > 0 ? Math.round((bearishCorrect / bearish.length) * 100) : null,
    total: evaluated.length,
  }
}

export default function PredictionStats({ predictions }: Props) {
  const [window, setWindow] = useState<Window>(1)
  const [threshold, setThreshold] = useState(5)

  const stats = calcAccuracy(predictions, window, threshold)

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3 text-muted uppercase tracking-wide">
        Prediction Accuracy
      </h2>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1">
          {([1, 3, 5] as Window[]).map(w => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                window === w
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted hover:border-border-strong hover:text-foreground'
              }`}
            >
              {w}d
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          Threshold
          <input
            type="number"
            min={0}
            max={50}
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-14 border border-border rounded px-2 py-1 text-xs bg-background text-foreground outline-none focus:border-border-strong"
          />
          %
        </label>
      </div>

      {/* Stats */}
      {!stats ? (
        <p className="text-sm text-muted">No evaluated predictions for this window yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-border rounded-lg p-4">
            <div className="text-2xl font-semibold">{stats.overall}%</div>
            <div className="text-xs text-muted mt-1">Overall ({stats.total} predictions)</div>
          </div>
          <div className="border border-border rounded-lg p-4">
            <div className="text-2xl font-semibold">
              {stats.bullish !== null ? `${stats.bullish}%` : '—'}
            </div>
            <div className="text-xs text-muted mt-1">
              Bullish ({predictions.filter(p => p.sentiment === 'bullish' && p[`t${window}_close` as keyof PredictionRow] !== null).length})
            </div>
          </div>
          <div className="border border-border rounded-lg p-4">
            <div className="text-2xl font-semibold">
              {stats.bearish !== null ? `${stats.bearish}%` : '—'}
            </div>
            <div className="text-xs text-muted mt-1">
              Bearish ({predictions.filter(p => p.sentiment === 'bearish' && p[`t${window}_close` as keyof PredictionRow] !== null).length})
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
