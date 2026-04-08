import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { searchSymbols, getCompanyNews } from '@/lib/finnhub'

function mockFetch(ok: boolean, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  })
}

function makeItem(symbol: string, type = 'Common Stock') {
  return { symbol, description: `${symbol} Inc`, type }
}

function makeArticle(datetime: number) {
  return { headline: `Headline ${datetime}`, summary: 'Summary', datetime, source: 'Reuters' }
}

describe('searchSymbols', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('filters out non-Common Stock types (ETF, ADR excluded)', async () => {
    vi.stubGlobal('fetch', mockFetch(true, {
      result: [
        makeItem('AAPL'),
        makeItem('SPY', 'ETF'),
        makeItem('BABA', 'ADR'),
        makeItem('MSFT'),
      ],
    }))
    const result = await searchSymbols('test')
    expect(result).toHaveLength(2)
    expect(result.map(r => r.ticker)).toEqual(['AAPL', 'MSFT'])
  })

  it('caps results at 8', async () => {
    vi.stubGlobal('fetch', mockFetch(true, {
      result: Array.from({ length: 12 }, (_, i) => makeItem(`T${i}`)),
    }))
    const result = await searchSymbols('test')
    expect(result).toHaveLength(8)
  })

  it('maps symbol → ticker and description → company', async () => {
    vi.stubGlobal('fetch', mockFetch(true, {
      result: [{ symbol: 'AAPL', description: 'Apple Inc', type: 'Common Stock' }],
    }))
    const result = await searchSymbols('apple')
    expect(result[0]).toEqual({ ticker: 'AAPL', company: 'Apple Inc' })
  })

  it('returns [] when response has no result key', async () => {
    vi.stubGlobal('fetch', mockFetch(true, {}))
    const result = await searchSymbols('test')
    expect(result).toEqual([])
  })

  it('throws when response is not ok', async () => {
    vi.stubGlobal('fetch', mockFetch(false, {}))
    await expect(searchSymbols('test')).rejects.toThrow('Finnhub search failed')
  })
})

describe('getCompanyNews', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sorts articles by datetime descending', async () => {
    vi.stubGlobal('fetch', mockFetch(true, [
      makeArticle(100),
      makeArticle(300),
      makeArticle(200),
    ]))
    const result = await getCompanyNews('AAPL', '2024-01-01', '2024-01-07')
    expect(result.map(a => a.datetime)).toEqual([300, 200, 100])
  })

  it('caps at 3 articles (returns top 3 by datetime)', async () => {
    vi.stubGlobal('fetch', mockFetch(true, [
      makeArticle(100), makeArticle(500), makeArticle(200),
      makeArticle(400), makeArticle(300),
    ]))
    const result = await getCompanyNews('AAPL', '2024-01-01', '2024-01-07')
    expect(result).toHaveLength(3)
    expect(result.map(a => a.datetime)).toEqual([500, 400, 300])
  })

  it('returns [] when response is not ok (silent failure)', async () => {
    vi.stubGlobal('fetch', mockFetch(false, {}))
    const result = await getCompanyNews('AAPL', '2024-01-01', '2024-01-07')
    expect(result).toEqual([])
  })

  it('returns [] for empty article array without error', async () => {
    vi.stubGlobal('fetch', mockFetch(true, []))
    const result = await getCompanyNews('AAPL', '2024-01-01', '2024-01-07')
    expect(result).toEqual([])
  })
})
