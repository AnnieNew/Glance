import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows the Glance wordmark', async ({ page }) => {
    await expect(page.getByText('Glance.')).toBeVisible()
  })

  test('shows the hero heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your stocks')
  })

  test('has a Sign in / Sign up button linking to /login', async ({ page }) => {
    const btn = page.getByRole('link', { name: 'Sign in / Sign up' })
    await expect(btn).toBeVisible()
    await expect(btn).toHaveAttribute('href', '/login')
  })

  test('has a Continue as Guest button linking to /guest', async ({ page }) => {
    const btn = page.getByRole('link', { name: 'Continue as Guest' })
    await expect(btn).toBeVisible()
    await expect(btn).toHaveAttribute('href', '/guest')
  })

  test('shows the delivery time in the footer', async ({ page }) => {
    await expect(page.getByText(/Delivered at/)).toBeVisible()
  })

  test('Sign in / Sign up navigates to login page', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign in / Sign up' }).click()
    await expect(page).toHaveURL('/login')
  })

  test('Continue as Guest navigates to guest page', async ({ page }) => {
    await page.getByRole('link', { name: 'Continue as Guest' }).click()
    await expect(page).toHaveURL('/guest')
  })
})
