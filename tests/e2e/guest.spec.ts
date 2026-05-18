import { test, expect } from '@playwright/test'

test.describe('Guest page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/guest')
  })

  test('shows the Glance wordmark', async ({ page }) => {
    await expect(page.getByText('Glance.')).toBeVisible()
  })

  test('shows the stock search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/Search stocks/i)).toBeVisible()
  })

  test('shows the email input', async ({ page }) => {
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible()
  })

  test('shows the EN and 中文 language toggles', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '中文', exact: true })).toBeVisible()
  })

  test('send button is disabled when no tickers or email', async ({ page }) => {
    const btn = page.getByRole('button', { name: /Send me a digest/i })
    await expect(btn).toBeDisabled()
  })

  test('shows sign in link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible()
  })

  test('stock search shows results when typing', async ({ page }) => {
    // Intercept the search API to return controlled results
    await page.route('/api/stocks/search*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ ticker: 'AAPL', company: 'Apple Inc.' }]),
      })
    })

    await page.getByPlaceholder(/Search stocks/i).fill('Apple')
    await expect(page.getByText('Apple Inc.')).toBeVisible()
  })

  test('adding a ticker shows it in the list and enables the send button with email', async ({ page }) => {
    await page.route('/api/stocks/search*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ ticker: 'AAPL', company: 'Apple Inc.' }]),
      })
    })

    await page.getByPlaceholder(/Search stocks/i).fill('Apple')
    await page.getByText('Apple Inc.').click()

    // Wait for the ticker to appear in the selected list (has a Remove button)
    await expect(page.locator('li').filter({ hasText: 'Remove' }).filter({ hasText: 'AAPL' })).toBeVisible()

    await page.getByPlaceholder('your@email.com').fill('test@example.com')
    await expect(page.getByRole('button', { name: /Send me a digest/i })).toBeEnabled()
  })

  test('successful send shows confirmation state', async ({ page }) => {
    await page.route('/api/stocks/search*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ ticker: 'AAPL', company: 'Apple Inc.' }]),
      })
    })

    await page.route('/api/digest/guest-send', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.getByPlaceholder(/Search stocks/i).fill('Apple')
    await page.getByText('Apple Inc.').click()
    await page.getByPlaceholder('your@email.com').fill('test@example.com')
    await page.getByRole('button', { name: /Send me a digest/i }).click()

    await expect(page.getByText(/Check your inbox/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /Sign up/i })).toBeVisible()
  })

  test('API error shows error message', async ({ page }) => {
    await page.route('/api/stocks/search*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ ticker: 'AAPL', company: 'Apple Inc.' }]),
      })
    })

    await page.route('/api/digest/guest-send', async route => {
      await route.fulfill({ status: 500, body: 'error' })
    })

    await page.getByPlaceholder(/Search stocks/i).fill('Apple')
    await page.getByText('Apple Inc.').click()
    await page.getByPlaceholder('your@email.com').fill('test@example.com')
    await page.getByRole('button', { name: /Send me a digest/i }).click()

    await expect(page.getByText(/Something went wrong/i)).toBeVisible()
  })

  test('switching to Chinese changes UI language', async ({ page }) => {
    await page.getByRole('button', { name: '中文' }).click()
    await expect(page.getByPlaceholder('你的邮箱')).toBeVisible()
    await expect(page.getByRole('button', { name: '发送摘要' })).toBeVisible()
  })
})
