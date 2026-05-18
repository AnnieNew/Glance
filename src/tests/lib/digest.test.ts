import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runDigestForUser } from '@/lib/digest'

// All external dependencies mocked via vi.hoisted so they're available
// before the module factory runs
const mockGetCompanyNews   = vi.hoisted(() => vi.fn())
const mockGetQuote         = vi.hoisted(() => vi.fn())
const mockNewsdataNews     = vi.hoisted(() => vi.fn())
const mockSummarize        = vi.hoisted(() => vi.fn())
const mockSendEmail        = vi.hoisted(() => vi.fn())
const mockInsertPredictions = vi.hoisted(() => vi.fn())
const mockAdminFrom        = vi.hoisted(() => vi.fn())

vi.mock('@/lib/finnhub',   () => ({ getCompanyNews: mockGetCompanyNews, getQuote: mockGetQuote }))
vi.mock('@/lib/newsdata',  () => ({ getCompanyNews: mockNewsdataNews }))
vi.mock('@/lib/anthropic', () => ({ summarizeNewsForUser: mockSummarize }))
vi.mock('@/lib/resend',    () => ({ sendDigestEmail: mockSendEmail }))
vi.mock('@/lib/predictions', () => ({
  insertPredictions: mockInsertPredictions,
  evaluatePendingPredictions: vi.fn(),
}))
vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))

// A chainable Supabase query mock: every method returns itself,
// and the chain is thenable — resolving to `result` when awaited.
function chain(result: unknown) {
  const c: Record<string, unknown> = {
    then: (res: (v: unknown) => void, rej: (e: unknown) => void) =>
      Promise.resolve(result).then(res, rej),
  }
  for (const m of [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gte', 'lte', 'lt', 'gt',
    'order', 'limit', 'single', 'or', 'not', 'filter',
  ]) {
    c[m] = vi.fn().mockReturnValue(c)
  }
  return c
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const USER_ID = 'user-abc'
const PROFILE  = { email: 'alice@example.com', language: 'en', nickname: 'Alice' }
const SUBS     = [{ ticker: 'AAPL', company: 'Apple Inc.' }]
const ARTICLES = [{ headline: 'Strong quarter', summary: '', datetime: 1, source: 'Reuters', url: 'https://x.com' }]
const ENTRIES  = [{ ticker: 'AAPL', company: 'Apple Inc.', insight: 'Strong quarter.', sources: [] }]
const LOG_ROW  = { id: 'log-1', token: 'tok-abc' }

// Set up the standard cron happy-path sequence of Supabase from() calls:
// 1. digest_logs  → cron check (not yet sent)
// 2. profiles     → profile found
// 3. subscriptions → has subs
// 4. digest_logs  → prev log (none)
// 5. digest_logs  → insert new log
function setupCronHappyPath() {
  mockAdminFrom
    .mockReturnValueOnce(chain({ data: [] }))                          // cron check
    .mockReturnValueOnce(chain({ data: PROFILE }))                     // profile
    .mockReturnValueOnce(chain({ data: SUBS }))                        // subscriptions
    .mockReturnValueOnce(chain({ data: null }))                        // prev log
    .mockReturnValueOnce(chain({ data: LOG_ROW, error: null }))        // insert log
  mockGetCompanyNews.mockResolvedValue(ARTICLES)
  mockGetQuote.mockResolvedValue({ price: 180, change: 2, changePercent: 1.1 })
  mockSummarize.mockResolvedValue(ENTRIES)
  mockSendEmail.mockResolvedValue({})
  mockInsertPredictions.mockResolvedValue(undefined)
}

// Manual source skips the cron check, so from() calls start at profile.
function setupManualHappyPath() {
  mockAdminFrom
    .mockReturnValueOnce(chain({ data: PROFILE }))                     // profile
    .mockReturnValueOnce(chain({ data: SUBS }))                        // subscriptions
    .mockReturnValueOnce(chain({ data: null }))                        // prev log
    .mockReturnValueOnce(chain({ data: LOG_ROW, error: null }))        // insert log
  mockGetCompanyNews.mockResolvedValue(ARTICLES)
  mockGetQuote.mockResolvedValue({ price: 180, change: 2, changePercent: 1.1 })
  mockSummarize.mockResolvedValue(ENTRIES)
  mockSendEmail.mockResolvedValue({})
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('runDigestForUser', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Skip conditions ─────────────────────────────────────────────────────

  it('returns skipped when cron digest already sent today', async () => {
    mockAdminFrom.mockReturnValueOnce(chain({ data: [{ id: 'existing' }] }))
    const result = await runDigestForUser(USER_ID, 'cron')
    expect(result).toBe('skipped')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns skipped when profile has no email', async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: [] }))           // cron check
      .mockReturnValueOnce(chain({ data: null }))          // no profile
    const result = await runDigestForUser(USER_ID, 'cron')
    expect(result).toBe('skipped')
  })

  it('returns skipped when user has no subscriptions', async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: [] }))            // cron check
      .mockReturnValueOnce(chain({ data: PROFILE }))       // profile
      .mockReturnValueOnce(chain({ data: [] }))            // empty subs
    const result = await runDigestForUser(USER_ID, 'cron')
    expect(result).toBe('skipped')
  })

  // ── Happy path ───────────────────────────────────────────────────────────

  it('returns sent on happy path', async () => {
    setupCronHappyPath()
    const result = await runDigestForUser(USER_ID, 'cron')
    expect(result).toBe('sent')
  })

  it('calls summarizeNewsForUser with fetched ticker news', async () => {
    setupCronHappyPath()
    await runDigestForUser(USER_ID, 'cron')
    expect(mockSummarize).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ ticker: 'AAPL', articles: ARTICLES }),
      ]),
      'en',
      expect.any(Map)
    )
  })

  it('calls sendDigestEmail with correct email and entries', async () => {
    setupCronHappyPath()
    await runDigestForUser(USER_ID, 'cron')
    expect(mockSendEmail).toHaveBeenCalledWith(
      PROFILE.email,
      expect.arrayContaining([expect.objectContaining({ ticker: 'AAPL' })]),
      expect.any(String),   // dateLabel
      'en',
      LOG_ROW.token,
      PROFILE.nickname
    )
  })

  it('attaches priceChange from quoteMap to each entry before sending', async () => {
    setupCronHappyPath()
    await runDigestForUser(USER_ID, 'cron')
    const sentEntries = mockSendEmail.mock.calls[0][1]
    expect(sentEntries[0].priceChange).toEqual({ price: 180, change: 2, changePercent: 1.1 })
  })

  it('calls insertPredictions with the log id after sending', async () => {
    setupCronHappyPath()
    await runDigestForUser(USER_ID, 'cron')
    // insertPredictions is fire-and-forget — wait a tick for it
    await Promise.resolve()
    expect(mockInsertPredictions).toHaveBeenCalledWith(LOG_ROW.id, expect.any(Array), expect.any(Date))
  })

  // ── Source: manual ───────────────────────────────────────────────────────

  it('skips the cron-already-sent check when source is manual', async () => {
    setupManualHappyPath()
    const result = await runDigestForUser(USER_ID, 'manual')
    expect(result).toBe('sent')
    // First from() call should be profiles, not digest_logs cron check
    expect(mockAdminFrom.mock.calls[0][0]).toBe('profiles')
  })

  // ── Newsdata fallback ─────────────────────────────────────────────────────

  it('falls back to newsdata when Finnhub returns no articles', async () => {
    setupCronHappyPath()
    mockGetCompanyNews.mockResolvedValue([])    // Finnhub returns nothing
    mockNewsdataNews.mockResolvedValue(ARTICLES)
    await runDigestForUser(USER_ID, 'cron')
    expect(mockNewsdataNews).toHaveBeenCalledWith('AAPL', 'Apple Inc.')
    expect(mockSummarize).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ articles: ARTICLES })]),
      'en',
      expect.any(Map)
    )
  })

  // ── Language passthrough ──────────────────────────────────────────────────

  it('passes zh language from profile to summarize and sendEmail', async () => {
    const zhProfile = { ...PROFILE, language: 'zh' }
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: [] }))
      .mockReturnValueOnce(chain({ data: zhProfile }))
      .mockReturnValueOnce(chain({ data: SUBS }))
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: LOG_ROW, error: null }))
    mockGetCompanyNews.mockResolvedValue(ARTICLES)
    mockGetQuote.mockResolvedValue(null)
    mockSummarize.mockResolvedValue(ENTRIES)
    mockSendEmail.mockResolvedValue({})

    await runDigestForUser(USER_ID, 'cron')

    expect(mockSummarize).toHaveBeenCalledWith(expect.any(Array), 'zh', expect.any(Map))
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.any(String), expect.any(Array), expect.any(String), 'zh', expect.any(String), expect.any(String)
    )
  })

  // ── Error handling ────────────────────────────────────────────────────────

  it('returns failed and logs failure when summarize throws', async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: [] }))
      .mockReturnValueOnce(chain({ data: PROFILE }))
      .mockReturnValueOnce(chain({ data: SUBS }))
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: null }))   // failure log insert
    mockGetCompanyNews.mockResolvedValue(ARTICLES)
    mockGetQuote.mockResolvedValue(null)
    mockSummarize.mockRejectedValue(new Error('Claude down'))

    const result = await runDigestForUser(USER_ID, 'cron')
    expect(result).toBe('failed')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns failed when sendDigestEmail throws', async () => {
    setupCronHappyPath()
    mockSendEmail.mockRejectedValue(new Error('Resend down'))
    // Add one more chain for the failure log insert
    mockAdminFrom.mockReturnValueOnce(chain({ data: null }))

    const result = await runDigestForUser(USER_ID, 'cron')
    expect(result).toBe('failed')
  })
})
