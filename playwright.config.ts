import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'react-spa-chromium',
      testMatch: 'theme.spec.ts',
      use: { baseURL: 'http://127.0.0.1:4173' },
    },
    {
      name: 'tanstack-start-chromium',
      testMatch: ['theme.spec.ts', 'ssr.spec.ts'],
      use: { baseURL: 'http://127.0.0.1:4174' },
    },
  ],
  webServer: [
    {
      command:
        'pnpm --filter @react-theme/react-spa preview --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
    },
    {
      command: 'pnpm --filter @react-theme/tanstack-start start',
      env: { HOST: '127.0.0.1', PORT: '4174' },
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: false,
    },
  ],
})
