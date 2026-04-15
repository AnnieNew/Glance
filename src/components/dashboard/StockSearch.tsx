'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { StockSearchResult } from '@/types'

interface Props {
  onAdd: (ticker: string, company: string) => void
  currentTickers: string[]
  atLimit: boolean
  language: string
}

export default function StockSearch({ onAdd, currentTickers, atLimit, language }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const zh = language === 'zh'

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(result: StockSearchResult) {
    if (currentTickers.includes(result.ticker)) return
    setOpen(false)
    setQuery('')
    onAdd(result.ticker, result.company)
    inputRef.current?.focus()
  }

  const placeholder = atLimit
    ? (zh ? '请先删除一支股票再添加' : 'Remove a stock to add another')
    : (zh ? '搜索股票 — 试试 AAPL 或 000001.SZ' : 'Search stocks — try "Apple" or "AAPL"')

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        disabled={atLimit}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-border-strong transition-colors bg-background text-foreground disabled:opacity-50"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-subtle">
          {zh ? '搜索中…' : 'searching…'}
        </span>
      )}

      {open && results.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-10 mt-1 w-full bg-background border border-border rounded-lg shadow-sm overflow-hidden"
        >
          {results.map(r => {
            const alreadyAdded = currentTickers.includes(r.ticker)
            return (
              <li key={r.ticker}>
                <button
                  type="button"
                  onClick={() => handleSelect(r)}
                  disabled={alreadyAdded}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-border transition-colors disabled:cursor-default"
                >
                  <span>
                    <span className="font-mono font-semibold">{r.ticker}</span>
                    <span className="text-muted ml-2">{r.company}</span>
                  </span>
                  {alreadyAdded && (
                    <span className="text-xs text-muted-subtle">{zh ? '已添加' : 'Added'}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
