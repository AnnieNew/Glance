import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { channel: 'chromium' } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
