import { describe, it, expect, beforeEach, vi } from 'vitest'
import { insertPredictions, evaluatePendingPredictions } from '@/lib/predictions'
import { DigestEntry } from '@/types'

const mockUpsert = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))
const mockUpdate = vi.hoisted(() => vi.fn())
const mockSelectOr = vi.hoisted(() => vi.fn())
const mockSelect = vi.hoisted(() => vi.fn().mockReturnValue({ or: mockSelectOr }))
const mockFrom = vi.hoisted(() => vi.fn())
const mockGetQuote = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock('@/lib/finnhub', () => ({
  getQuote: mockGetQuote,
}))

function makeEntry(ticker: string, sentiment: 'bullish' | 'bearish' | 'neutral', price: number | null): DigestEntry {
  return {
    ticker,
    company: `${ticker} Inc.`,
    insight: 'Test insight.',
    signal: {
      sentiment,
      events: [],
      mechanisms: { revenue: 'unclear', costs: 'unclear', growth: 'unclear', risk: 'unclear' },
      earlyWarnings: [],
    },
    priceChange: price !== null ? { price, change: 0, changePercent: 0 } : undefined,
  }
}

describe('insertPredictions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ upsert: mockUpsert })
  })

  it('upserts bullish and bearish entries with priceChange', async () => {
    const entries = [
      makeEntry('AAPL', 'bullish', 180),
      makeEntry('MSFT', 'bearish', 420),
    ]
    await insertPredictions('log-1', entries, new Date('2026-01-01'))
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ ticker: 'AAPL', sentiment: 'bullish', price_at_send: 180 }),
        expect.objectContaining({ ticker: 'MSFT', sentiment: 'bearish', price_at_send: 420 }),
      ]),
      { onConflict: 'digest_log_id,ticker' }
    )
  })

  it('skips neutral entries', async () => {
    const entries = [makeEntry('AAPL', 'neutral', 180)]
    await insertPredictions('log-1', entries, new Date())
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('skips entries with no priceChange', async () => {
    const entries = [makeEntry('AAPL', 'bullish', null)]
    await insertPredictions('log-1', entries, new Date())
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('only upserts the directional entries from a mixed list', async () => {
    const entries = [
      makeEntry('AAPL', 'bullish', 180),
      makeEntry('GOOG', 'neutral', 150),
      makeEntry('TSLA', 'bearish', 250),
      makeEntry('AMZN', 'bullish', null),
    ]
    await insertPredictions('log-1', entries, new Date())
    const upsertArg = mockUpsert.mock.calls[0][0] as { ticker: string }[]
    expect(upsertArg).toHaveLength(2)
    expect(upsertArg.map(r => r.ticker).sort()).toEqual(['AAPL', 'TSLA'])
  })
})

describe('evaluatePendingPredictions', () => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const eqMock = vi.fn().mockResolvedValue({ error: null })
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate })
  })

  it('does nothing when there are no pending rows', async () => {
    mockSelectOr.mockResolvedValue({ data: [] })
    await evaluatePendingPredictions()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('skips a window whose time has not yet passed', async () => {
    const sentAt = new Date(Date.now() - 0.5 * MS_PER_DAY).toISOString()
    mockSelectOr.mockResolvedValue({
      data: [{ id: 'r1', ticker: 'AAPL', sent_at: sentAt, t1_close: null, t3_close: null, t5_close: null }],
    })
    await evaluatePendingPredictions()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('fills t1_close from priceMap when ticker is present', async () => {
    const sentAt = new Date(Date.now() - 2 * MS_PER_DAY).toISOString()
    mockSelectOr.mockResolvedValue({
      data: [{ id: 'r1', ticker: 'AAPL', sent_at: sentAt, t1_close: null, t3_close: null, t5_close: null }],
    })
    const priceMap = new Map([['AAPL', { price: 195, change: 0, changePercent: 0 }]])
    await evaluatePendingPredictions(priceMap)
    expect(mockGetQuote).not.toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ t1_close: 195 }))
  })

  it('falls back to getQuote when ticker is not in priceMap', async () => {
    const sentAt = new Date(Date.now() - 2 * MS_PER_DAY).toISOString()
    mockSelectOr.mockResolvedValue({
      data: [{ id: 'r1', ticker: 'AAPL', sent_at: sentAt, t1_close: null, t3_close: null, t5_close: null }],
    })
    mockGetQuote.mockResolvedValue({ price: 200, change: 0, changePercent: 0 })
    await evaluatePendingPredictions(new Map())
    expect(mockGetQuote).toHaveBeenCalledWith('AAPL')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ t1_close: 200 }))
  })

  it('skips a window that already has a close value', async () => {
    const sentAt = new Date(Date.now() - 2 * MS_PER_DAY).toISOString()
    mockSelectOr.mockResolvedValue({
      data: [{ id: 'r1', ticker: 'AAPL', sent_at: sentAt, t1_close: 185, t3_close: null, t5_close: null }],
    })
    const priceMap = new Map([['AAPL', { price: 195, change: 0, changePercent: 0 }]])
    await evaluatePendingPredictions(priceMap)
    // t3_close not yet due (only 2 days passed), t1_close already set — nothing to update
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
