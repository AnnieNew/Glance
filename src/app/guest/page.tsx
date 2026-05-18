'use client'

import { useState } from 'react'
import StockSearch from '@/components/dashboard/StockSearch'
import Link from 'next/link'

interface Ticker {
  ticker: string
  company: string
}

type Status = 'idle' | 'loading' | 'sent' | 'error'

export default function GuestPage() {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [email, setEmail] = useState('')
  const [language, setLanguage] = useState<'en' | 'zh'>('en')
  const [status, setStatus] = useState<Status>('idle')

  const zh = language === 'zh'

  function handleAdd(ticker: string, company: string) {
    setTickers(prev => [...prev, { ticker, company }])
  }

  function handleRemove(ticker: string) {
    setTickers(prev => prev.filter(t => t.ticker !== ticker))
  }

  async function handleSend() {
    if (!email || tickers.length === 0) return
    setStatus('loading')
    try {
      const res = await fetch('/api/digest/guest-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tickers, language }),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="font-serif italic text-3xl wordmark">Glance.</h1>
          <p className="text-foreground">{zh ? '已发送，请查收邮件 ✓' : 'Check your inbox ✓'}</p>
          <p className="text-sm text-muted">
            {zh ? '想每天自动获取？' : 'Want daily digests automatically?'}
          </p>
          <Link
            href="/login"
            className="inline-block text-sm border border-border rounded-lg px-4 py-2 hover:bg-border transition-colors"
          >
            {zh ? '注册 →' : 'Sign up →'}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="font-serif italic text-3xl wordmark">Glance.</h1>
          <p className="text-sm text-muted mt-1">
            {zh ? '选择最多 5 支股票，立即获取 AI 摘要' : 'Pick up to 5 stocks, get an AI digest instantly — no account needed.'}
          </p>
        </div>

        <StockSearch
          onAdd={handleAdd}
          currentTickers={tickers.map(t => t.ticker)}
          atLimit={tickers.length >= 5}
          language={language}
        />

        {tickers.length > 0 && (
          <ul className="space-y-1">
            {tickers.map(t => (
              <li key={t.ticker} className="flex items-center justify-between text-sm border border-border rounded-lg px-3 py-2">
                <span>
                  <span className="font-mono font-semibold">{t.ticker}</span>
                  <span className="text-muted ml-2">{t.company}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(t.ticker)}
                  className="text-muted-subtle hover:text-foreground transition-colors ml-2 text-xs"
                >
                  {zh ? '删除' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={zh ? '你的邮箱' : 'your@email.com'}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-border-strong transition-colors bg-background text-foreground"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`text-xs px-3 py-1 rounded border transition-colors ${language === 'en' ? 'border-foreground text-foreground' : 'border-border text-muted'}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('zh')}
              className={`text-xs px-3 py-1 rounded border transition-colors ${language === 'zh' ? 'border-foreground text-foreground' : 'border-border text-muted'}`}
            >
              中文
            </button>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={status === 'loading' || tickers.length === 0 || !email}
            className="w-full bg-foreground text-background rounded-lg px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {status === 'loading'
              ? (zh ? '发送中…' : 'Sending…')
              : (zh ? '发送摘要' : 'Send me a digest')}
          </button>

          {status === 'error' && (
            <p className="text-sm text-red-500 text-center">
              {zh ? '发送失败，请重试' : 'Something went wrong — try again'}
            </p>
          )}
        </div>

        <div className="text-center">
          <Link href="/login" className="text-xs text-muted hover:text-foreground transition-colors">
            {zh ? '已有账号？登录 →' : 'Already have an account? Sign in →'}
          </Link>
        </div>
      </div>
    </main>
  )
}
