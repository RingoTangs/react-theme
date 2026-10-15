import type { ThemeTestOptions } from './tests/e2e/options'
import { defineConfig, devices } from '@playwright/test'
import { version as react19Version } from 'react'

export default defineConfig<ThemeTestOptions>({
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
      use: {
        baseURL: 'http://127.0.0.1:4173',
        darkClassName: 'theme-dark',
        reactVersion: '18.2.0',
      },
    },
    {
      name: 'tanstack-start-chromium',
      testMatch: ['theme.spec.ts', 'ssr.spec.ts'],
      use: {
        baseURL: 'http://127.0.0.1:4174',
        darkClassName: 'dark',
        reactVersion: react19Version,
      },
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
