import { test, expect } from '@playwright/test'

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows the Glance wordmark', async ({ page }) => {
    await expect(page.getByText('Glance.')).toBeVisible()
  })

  test('shows the Google sign-in button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible()
  })

  test('shows the magic link email input', async ({ page }) => {
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
  })

  test('shows the Continue as Guest link', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Continue as Guest' })).toBeVisible()
  })

  test('Continue as Guest navigates to /guest', async ({ page }) => {
    await page.getByRole('link', { name: 'Continue as Guest' }).click()
    await expect(page).toHaveURL('/guest')
  })
})
