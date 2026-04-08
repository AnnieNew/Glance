import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, DELETE } from '@/app/api/subscriptions/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

// Builds a chainable Supabase query stub where the last method in a chain
// resolves to `terminalResult`. For the count query the chain is:
//   .from().select().eq()  → { count }
// For insert:
//   .from().insert().select().single()  → { data, error }
// For delete:
//   .from().delete().eq().eq()  → { error }

function makeCountStub(count: number) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count }),
    }),
  }
}

function makeInsertStub(data: unknown, error: unknown = null) {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  }
}

function makeDeleteStub(error: unknown = null) {
  const eqFn: ReturnType<typeof vi.fn> = vi.fn().mockReturnThis()
  eqFn.mockReturnValueOnce({ eq: eqFn })  // first .eq() returns another chainable
    .mockResolvedValue({ error })           // second .eq() resolves
  return {
    delete: vi.fn().mockReturnValue({ eq: eqFn }),
    _eqFn: eqFn,
  }
}

function makeAuth(user: { id: string } | null) {
  return {
    getUser: vi.fn().mockResolvedValue({ data: { user } }),
  }
}

function makePostRequest(body: object) {
  return new NextRequest('http://localhost/api/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest(body: object) {
  return new NextRequest('http://localhost/api/subscriptions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/subscriptions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when no authenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth(null),
    } as any)
    const res = await POST(makePostRequest({ ticker: 'AAPL', company: 'Apple' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when ticker is missing', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth({ id: 'u1' }),
    } as any)
    const res = await POST(makePostRequest({ company: 'Apple' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when company is missing', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth({ id: 'u1' }),
    } as any)
    const res = await POST(makePostRequest({ ticker: 'AAPL' }))
    expect(res.status).toBe(400)
  })

  it('returns 422 when user is at the 20-subscription limit', async () => {
    const fromMock = vi.fn().mockReturnValue(makeCountStub(20))
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth({ id: 'u1' }),
      from: fromMock,
    } as any)
    const res = await POST(makePostRequest({ ticker: 'AAPL', company: 'Apple' }))
    expect(res.status).toBe(422)
  })

  it('returns 409 when Supabase reports a unique constraint violation (code 23505)', async () => {
    const fromMock = vi.fn()
      .mockReturnValueOnce(makeCountStub(5))
      .mockReturnValue(makeInsertStub(null, { code: '23505', message: 'duplicate' }))
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth({ id: 'u1' }),
      from: fromMock,
    } as any)
    const res = await POST(makePostRequest({ ticker: 'AAPL', company: 'Apple' }))
    expect(res.status).toBe(409)
  })

  it('returns 201 with subscription data on success', async () => {
    const subscription = { id: 'x1', user_id: 'u1', ticker: 'AAPL', company: 'Apple', created_at: '' }
    const fromMock = vi.fn()
      .mockReturnValueOnce(makeCountStub(3))
      .mockReturnValue(makeInsertStub(subscription))
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth({ id: 'u1' }),
      from: fromMock,
    } as any)
    const res = await POST(makePostRequest({ ticker: 'AAPL', company: 'Apple' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toMatchObject({ ticker: 'AAPL', company: 'Apple' })
  })

  it('uppercases the ticker before inserting', async () => {
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { ticker: 'AAPL' }, error: null }),
      }),
    })
    const fromMock = vi.fn()
      .mockReturnValueOnce(makeCountStub(0))
      .mockReturnValue({ insert: insertSpy })
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth({ id: 'u1' }),
      from: fromMock,
    } as any)
    await POST(makePostRequest({ ticker: 'aapl', company: 'Apple' }))
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'AAPL' })
    )
  })
})

describe('DELETE /api/subscriptions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when no authenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth(null),
    } as any)
    const res = await DELETE(makeDeleteRequest({ ticker: 'AAPL' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when ticker is missing', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth({ id: 'u1' }),
    } as any)
    const res = await DELETE(makeDeleteRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 200 with { ok: true } on success', async () => {
    const { delete: deleteFn, _eqFn } = makeDeleteStub(null)
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth({ id: 'u1' }),
      from: vi.fn().mockReturnValue({ delete: deleteFn }),
    } as any)
    const res = await DELETE(makeDeleteRequest({ ticker: 'AAPL' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it('uppercases the ticker before deleting', async () => {
    const eqSpy = vi.fn()
    eqSpy.mockReturnValueOnce({ eq: eqSpy }).mockResolvedValue({ error: null })
    const deleteFn = vi.fn().mockReturnValue({ eq: eqSpy })
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth({ id: 'u1' }),
      from: vi.fn().mockReturnValue({ delete: deleteFn }),
    } as any)
    await DELETE(makeDeleteRequest({ ticker: 'aapl' }))
    // The second .eq() call is for ticker — assert it uses uppercase
    expect(eqSpy).toHaveBeenCalledWith('ticker', 'AAPL')
  })
})
