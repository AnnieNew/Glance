import { describe, it, expect, beforeEach, vi } from 'vitest'
import { summarizeNewsForUser } from '@/lib/anthropic'
import { TickerNews } from '@/types'

// vi.hoisted ensures mockCreate is initialised before the vi.mock factory runs
// (the factory is hoisted above imports, so plain `let` would be undefined)
const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => {
  // Must use a regular function (not an arrow function) so it can be called with `new`
  function AnthropicMock() {
    return { messages: { create: mockCreate } }
  }
  return { default: AnthropicMock }
})

function makeNews(ticker: string, company: string, count = 1): TickerNews {
  return {
    ticker,
    company,
    articles: Array.from({ length: count }, (_, i) => ({
      headline: `${ticker} headline ${i + 1}`,
      summary: `Summary ${i + 1}`,
      datetime: 1000 + i,
      source: 'Reuters',
    })),
  }
}

describe('summarizeNewsForUser', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  it('returns [] immediately for empty input without calling Claude', async () => {
    const result = await summarizeNewsForUser([])
    expect(result).toEqual([])
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns fallback entries when all tickers have no articles without calling Claude', async () => {
    const input: TickerNews[] = [
      { ticker: 'AAPL', company: 'Apple', articles: [] },
      { ticker: 'MSFT', company: 'Microsoft', articles: [] },
    ]
    const result = await summarizeNewsForUser(input)
    expect(result).toHaveLength(2)
    expect(result[0].insight).toBe('No significant developments today.')
    expect(result[0].sources).toEqual([])
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('parses standard TICKER: insight lines correctly', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'AAPL: Strong earnings beat.\nMSFT: Cloud revenue surges.' }],
    })
    const result = await summarizeNewsForUser([makeNews('AAPL', 'Apple'), makeNews('MSFT', 'Microsoft')])
    expect(result).toHaveLength(2)
    expect(result.find(e => e.ticker === 'AAPL')?.insight).toBe('Strong earnings beat.')
    expect(result.find(e => e.ticker === 'MSFT')?.insight).toBe('Cloud revenue surges.')
  })

  it('uses fallback when ticker is present in input but missing from Claude response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'AAPL: Strong earnings beat.' }],
    })
    const result = await summarizeNewsForUser([makeNews('AAPL', 'Apple'), makeNews('TSLA', 'Tesla')])
    expect(result.find(e => e.ticker === 'TSLA')?.insight).toBe('No significant developments today.')
  })

  it('ignores lowercase lines in Claude response (regex requires [A-Z.])', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'aapl: lowercase line\nAAPL: Valid insight.' }],
    })
    const result = await summarizeNewsForUser([makeNews('AAPL', 'Apple')])
    expect(result[0].insight).toBe('Valid insight.')
  })

  it('parses tickers containing a dot (e.g. BRK.B)', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'BRK.B: Berkshire acquires new stake.' }],
    })
    const result = await summarizeNewsForUser([makeNews('BRK.B', 'Berkshire Hathaway B')])
    expect(result[0].insight).toBe('Berkshire acquires new stake.')
  })

  it('trims trailing whitespace from the parsed insight', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'AAPL: Strong earnings.   ' }],
    })
    const result = await summarizeNewsForUser([makeNews('AAPL', 'Apple')])
    expect(result[0].insight).toBe('Strong earnings.')
  })

  it('handles non-text content blocks gracefully (all tickers fall back)', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', input: {} }],
    })
    const result = await summarizeNewsForUser([makeNews('AAPL', 'Apple')])
    expect(result[0].insight).toBe('No significant developments today.')
  })

  it('appends Chinese instruction to prompt when language is zh', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'AAPL: 业绩超预期。' }],
    })
    await summarizeNewsForUser([makeNews('AAPL', 'Apple')], 'zh')
    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('简体中文')
    expect(prompt).toContain('今日无重大进展。')
  })

  it('does not append Chinese instruction when language is en', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'AAPL: Strong quarter.' }],
    })
    await summarizeNewsForUser([makeNews('AAPL', 'Apple')], 'en')
    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).not.toContain('简体中文')
  })

  it('uses Chinese fallback string when language is zh and ticker missing from response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '' }],
    })
    const result = await summarizeNewsForUser([makeNews('AAPL', 'Apple')], 'zh')
    expect(result[0].insight).toBe('今日无重大进展。')
  })

  it('excludes tickers with no articles from the Claude call but includes them with fallback in result', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'AAPL: Solid quarter.' }],
    })
    const input: TickerNews[] = [
      makeNews('AAPL', 'Apple', 2),
      { ticker: 'GOOG', company: 'Alphabet', articles: [] },
    ]
    const result = await summarizeNewsForUser(input)
    // Both tickers appear in the result
    expect(result).toHaveLength(2)
    expect(result.find(r => r.ticker === 'AAPL')?.insight).toBe('Solid quarter.')
    // GOOG has no articles so it gets the fallback, not sent to Claude
    expect(result.find(r => r.ticker === 'GOOG')?.insight).toBe('No significant developments today.')
    // Verify the prompt sent to Claude does not mention GOOG
    const prompt: string = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).not.toContain('GOOG')
  })
})
