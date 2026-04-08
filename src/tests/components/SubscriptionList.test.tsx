import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SubscriptionList from '@/components/dashboard/SubscriptionList'
import { Subscription } from '@/types'

// Stub StockSearch so we can trigger onAdd without real Finnhub calls,
// and inspect the atLimit prop that SubscriptionList passes down.
vi.mock('@/components/dashboard/StockSearch', () => ({
  default: ({ onAdd, atLimit }: { onAdd: (t: string, c: string) => void; atLimit: boolean }) => (
    <div>
      <button onClick={() => onAdd('TSLA', 'Tesla')}>Add TSLA</button>
      <button onClick={() => onAdd('NVDA', 'Nvidia')}>Add NVDA</button>
      {atLimit && <span>At limit</span>}
    </div>
  ),
}))

function makeSub(ticker: string): Subscription {
  return { id: ticker, user_id: 'u1', ticker, company: `${ticker} Inc`, created_at: '' }
}

describe('SubscriptionList — stage-and-save state machine', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('renders initial subscriptions', () => {
    render(<SubscriptionList initialSubscriptions={[makeSub('AAPL')]} />)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('queues a pending add without calling fetch, shows unsaved badge and save bar', async () => {
    render(<SubscriptionList initialSubscriptions={[]} />)
    await user.click(screen.getByText('Add TSLA'))

    expect(screen.getByText('TSLA')).toBeInTheDocument()
    expect(screen.getByText('unsaved')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByText('1 unsaved change')).toBeInTheDocument()
  })

  it('cancels a pending add when its × is clicked, without calling fetch', async () => {
    render(<SubscriptionList initialSubscriptions={[]} />)
    await user.click(screen.getByText('Add TSLA'))
    expect(screen.getByText('TSLA')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove tsla/i }))
    expect(screen.queryByText('TSLA')).not.toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('calls POST with correct body when Save is clicked', async () => {
    render(<SubscriptionList initialSubscriptions={[]} />)
    await user.click(screen.getByText('Add TSLA'))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1)
    })
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/api/subscriptions')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toMatchObject({ ticker: 'TSLA', company: 'Tesla' })
  })

  it('removes unsaved badge after save and hides save bar', async () => {
    render(<SubscriptionList initialSubscriptions={[]} />)
    await user.click(screen.getByText('Add TSLA'))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(screen.queryByText('unsaved')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })

  it('greyes out a committed stock when marked for removal and shows undo', async () => {
    render(<SubscriptionList initialSubscriptions={[makeSub('AAPL')]} />)
    await user.click(screen.getByRole('button', { name: /remove aapl/i }))

    expect(screen.getByRole('button', { name: /cancel removing aapl/i })).toBeInTheDocument()
    expect(screen.getByText(/unsaved change/i)).toBeInTheDocument()
  })

  it('toggles removal off when undo is clicked, restoring the × button', async () => {
    render(<SubscriptionList initialSubscriptions={[makeSub('AAPL')]} />)
    await user.click(screen.getByRole('button', { name: /remove aapl/i }))
    await user.click(screen.getByRole('button', { name: /cancel removing aapl/i }))

    expect(screen.getByRole('button', { name: /remove aapl/i })).toBeInTheDocument()
    expect(screen.queryByText(/unsaved change/i)).not.toBeInTheDocument()
  })

  it('calls DELETE with correct body when saving a pending removal', async () => {
    render(<SubscriptionList initialSubscriptions={[makeSub('AAPL')]} />)
    await user.click(screen.getByRole('button', { name: /remove aapl/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.method).toBe('DELETE')
    expect(JSON.parse(init.body)).toMatchObject({ ticker: 'AAPL' })
  })

  it('clears all pending changes on Discard without calling fetch', async () => {
    render(<SubscriptionList initialSubscriptions={[makeSub('AAPL')]} />)
    await user.click(screen.getByText('Add TSLA'))
    await user.click(screen.getByRole('button', { name: /remove aapl/i }))
    await user.click(screen.getByRole('button', { name: /discard/i }))

    expect(screen.queryByText('unsaved')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove aapl/i })).toBeInTheDocument()
    expect(screen.queryByText('TSLA')).not.toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('passes atLimit=true to StockSearch when totalCount reaches 20', () => {
    render(<SubscriptionList initialSubscriptions={Array.from({ length: 20 }, (_, i) => makeSub(`T${i}`))} />)
    expect(screen.getByText('At limit')).toBeInTheDocument()
  })

  it('atLimit accounts for pending adds (19 committed + 1 pending = at limit)', async () => {
    render(<SubscriptionList initialSubscriptions={Array.from({ length: 19 }, (_, i) => makeSub(`T${i}`))} />)
    expect(screen.queryByText('At limit')).not.toBeInTheDocument()

    await user.click(screen.getByText('Add TSLA'))
    expect(screen.getByText('At limit')).toBeInTheDocument()
  })

  it('atLimit decrements when a pending removal is toggled (20 committed, mark 1 for removal → no longer at limit)', async () => {
    render(<SubscriptionList initialSubscriptions={Array.from({ length: 20 }, (_, i) => makeSub(`T${i}`))} />)
    expect(screen.getByText('At limit')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove t0/i }))
    expect(screen.queryByText('At limit')).not.toBeInTheDocument()
  })

  it('silently ignores a duplicate add (same ticker added twice shows one card)', async () => {
    render(<SubscriptionList initialSubscriptions={[]} />)
    await user.click(screen.getByText('Add TSLA'))
    await user.click(screen.getByText('Add TSLA'))

    expect(screen.getAllByText('TSLA')).toHaveLength(1)
  })
})
