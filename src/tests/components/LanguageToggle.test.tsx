import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LanguageToggle from '@/components/dashboard/LanguageToggle'

describe('LanguageToggle', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('renders with correct initial selection highlighted', () => {
    render(<LanguageToggle initialLanguage="en" />)
    // EN button should be primary (black), 中文 ghost
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '中文' })).toBeInTheDocument()
  })

  it('does not show Save button when nothing has changed', () => {
    render(<LanguageToggle initialLanguage="en" />)
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
  })

  it('shows Save button after switching to a different language', async () => {
    render(<LanguageToggle initialLanguage="en" />)
    await user.click(screen.getByRole('button', { name: '中文' }))
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('does not call fetch when language is switched but Save not clicked', async () => {
    render(<LanguageToggle initialLanguage="en" />)
    await user.click(screen.getByRole('button', { name: '中文' }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('calls PATCH /api/profile with correct language on Save', async () => {
    render(<LanguageToggle initialLanguage="en" />)
    await user.click(screen.getByRole('button', { name: '中文' }))
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/api/profile')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({ language: 'zh' })
  })

  it('hides Save button after a successful save', async () => {
    render(<LanguageToggle initialLanguage="en" />)
    await user.click(screen.getByRole('button', { name: '中文' }))
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument())
  })

  it('hides Save button when switching back to the already-saved language', async () => {
    render(<LanguageToggle initialLanguage="en" />)
    await user.click(screen.getByRole('button', { name: '中文' }))
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
})
