import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/profile/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'

function makeAuth(user: { id: string } | null) {
  return {
    getUser: vi.fn().mockResolvedValue({ data: { user } }),
  }
}

function makeUpdateStub(error: unknown = null) {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error }),
    }),
  }
}

function makePatchRequest(body: object) {
  return new NextRequest('http://localhost/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/profile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when no authenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth(null),
    } as any)
    const res = await PATCH(makePatchRequest({ language: 'en' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when language is missing', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth({ id: 'u1' }),
    } as any)
    const res = await PATCH(makePatchRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 when language is not "en" or "zh"', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth({ id: 'u1' }),
    } as any)
    const res = await PATCH(makePatchRequest({ language: 'fr' }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with { ok: true } when language is "en"', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth({ id: 'u1' }),
      from: vi.fn().mockReturnValue(makeUpdateStub(null)),
    } as any)
    const res = await PATCH(makePatchRequest({ language: 'en' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('returns 200 with { ok: true } when language is "zh"', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: makeAuth({ id: 'u1' }),
      from: vi.fn().mockReturnValue(makeUpdateStub(null)),
    } as any)
    const res = await PATCH(makePatchRequest({ language: 'zh' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
