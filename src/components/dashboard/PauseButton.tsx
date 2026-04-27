'use client'

import { useState } from 'react'

interface Props {
  initialPaused: boolean
  language: string
}

export default function PauseButton({ initialPaused, language }: Props) {
  const [paused, setPaused] = useState(initialPaused)
  const [loading, setLoading] = useState(false)
  const zh = language === 'zh'

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/profile/pause', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setPaused(data.paused)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-sm text-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? (zh ? '更新中…' : 'Updating…')
          : paused
            ? (zh ? '恢复邮件订阅' : 'Resume digest emails')
            : (zh ? '暂停邮件订阅' : 'Pause digest emails')}
      </button>
      {paused && (
        <span className="text-xs text-muted-subtle">{zh ? '（已暂停）' : '(paused)'}</span>
      )}
    </div>
  )
}
