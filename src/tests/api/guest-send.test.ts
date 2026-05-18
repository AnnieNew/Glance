import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/digest/guest-send/route'

const mockGetCompanyNews = vi.hoisted(() => vi.fn().mockResolvedValue([]))
const mockNewsdataGetCompanyNews = vi.hoisted(() => vi.fn().mockResolvedValue([]))
const mockSummarize = vi.hoisted(() => vi.fn())
const mockSendEmail = vi.hoisted(() => vi.fn().mockResolvedValue({}))
const mockInsert = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))

vi.mock('@/lib/finnhub', () => ({ getCompanyNews: mockGetCompanyNews }))
vi.mock('@/lib/newsdata', () => ({ getCompanyNews: mockNewsdataGetCompanyNews }))
vi.mock('@/lib/anthropic', () => ({ summarizeNewsForUser: mockSummarize }))
vi.mock('@/lib/resend', () => ({ sendDigestEmail: mockSendEmail }))
vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({ insert: mockInsert }),
  })),
}))

const TICKERS = [
  { ticker: 'AAPL', company: 'Apple Inc.' },
  { ticker: 'MSFT', company: 'Microsoft Corp.' },
]

const ENTRIES = [
  { ticker: 'AAPL', company: 'Apple Inc.', insight: 'Good quarter.', sources: [] },
  { ticker: 'MSFT', company: 'Microsoft Corp.', insight: 'Cloud growth.', sources: [] },
]

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/digest/guest-send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/digest/guest-send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSummarize.mockResolvedValue(ENTRIES)
  })

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ tickers: TICKERS }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when tickers array is empty', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com', tickers: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when tickers is missing', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com' }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with { ok: true } on success', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com', tickers: TICKERS }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('calls summarizeNewsForUser and sendDigestEmail on happy path', async () => {
    await POST(makeRequest({ email: 'test@example.com', tickers: TICKERS }))
    expect(mockSummarize).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledWith(
      'test@example.com',
      ENTRIES,
      expect.any(String),
      'en',
      '',
      undefined
    )
  })

  it('caps tickers at 5 even if more are provided', async () => {
    const manyTickers = Array.from({ length: 8 }, (_, i) => ({ ticker: `T${i}`, company: `Co ${i}` }))
    await POST(makeRequest({ email: 'test@example.com', tickers: manyTickers }))
    expect(mockGetCompanyNews.mock.calls.length).toBe(5)
  })

  it('passes language through to summarize and sendDigestEmail', async () => {
    await POST(makeRequest({ email: 'test@example.com', tickers: TICKERS, language: 'zh' }))
    expect(mockSummarize).toHaveBeenCalledWith(expect.any(Array), 'zh')
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.any(String), expect.any(Array), expect.any(String), 'zh', '', undefined
    )
  })

  it('still returns 200 even if DB insert fails', async () => {
    mockInsert.mockResolvedValue({ error: new Error('DB down') })
    const res = await POST(makeRequest({ email: 'test@example.com', tickers: TICKERS }))
    expect(res.status).toBe(200)
  })

  it('falls back to newsdata when finnhub returns no articles', async () => {
    mockGetCompanyNews.mockResolvedValue([])
    mockNewsdataGetCompanyNews.mockResolvedValue([{ headline: 'Fallback', summary: '', url: '' }])
    await POST(makeRequest({ email: 'test@example.com', tickers: [TICKERS[0]] }))
    expect(mockNewsdataGetCompanyNews).toHaveBeenCalled()
  })
})
