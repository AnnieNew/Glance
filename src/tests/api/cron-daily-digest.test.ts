import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/cron/daily-digest/route'

vi.mock('@/lib/digest', () => ({
  runDailyDigest: vi.fn(),
}))

import { runDailyDigest } from '@/lib/digest'

function makeRequest(authHeader?: string) {
  return new NextRequest('http://localhost/api/cron/daily-digest', {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

describe('GET /api/cron/daily-digest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
  })

  it('returns 401 when Authorization header is absent', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    expect(runDailyDigest).not.toHaveBeenCalled()
  })

  it('returns 401 when Authorization header has the wrong secret', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
    expect(runDailyDigest).not.toHaveBeenCalled()
  })

  it('returns 401 when token is correct but missing "Bearer " prefix', async () => {
    const res = await GET(makeRequest('test-secret'))
    expect(res.status).toBe(401)
    expect(runDailyDigest).not.toHaveBeenCalled()
  })

  it('returns 200 with digest result for valid Bearer token', async () => {
    vi.mocked(runDailyDigest).mockResolvedValue({ sent: 3, skipped: 1, failed: 0 })
    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ sent: 3, skipped: 1, failed: 0 })
  })

  it('returns 500 when runDailyDigest throws, without re-throwing', async () => {
    vi.mocked(runDailyDigest).mockRejectedValue(new Error('DB down'))
    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'Internal error' })
  })
})
