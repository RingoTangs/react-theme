import type { Page } from '@playwright/test'
import { test as base, expect } from '@playwright/test'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const test = base.extend<{ storedTheme: ThemeMode | null }>({
  storedTheme: ['dark', { option: true }],
  storageState: async ({ baseURL, storedTheme }, provide) => {
    if (!baseURL) throw new Error('An application baseURL is required')
    await provide({
      cookies: [],
      origins: [
        {
          origin: new URL(baseURL).origin,
          localStorage:
            storedTheme === null ? [] : [{ name: 'theme', value: storedTheme }],
        },
      ],
    })
  },
})

export { expect } from '@playwright/test'

export function themeButton(
  page: Page,
  mode: ThemeMode,
): ReturnType<Page['getByRole']> {
  const labels = { light: 'Light', dark: 'Dark', system: 'System' }
  return page.getByRole('button', { name: labels[mode], exact: true })
}

export async function expectTheme(
  page: Page,
  mode: ThemeMode,
  resolved: ResolvedTheme,
): Promise<void> {
  await expect(themeButton(page, mode)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(`Theme: ${mode}`, { exact: true })).toBeVisible()
  await expect(
    page.getByText(`Resolved theme: ${resolved}`, { exact: true }),
  ).toBeVisible()
  await expectRootTheme(page, resolved)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('theme')))
    .toBe(mode)
}

export async function expectRootTheme(
  page: Page,
  resolved: ResolvedTheme,
): Promise<void> {
  const html = page.locator('html')
  if (resolved === 'dark') await expect(html).toHaveClass(/\bdark\b/)
  else await expect(html).not.toHaveClass(/\bdark\b/)
  await expect
    .poll(() => html.evaluate((element) => element.style.colorScheme))
    .toBe(resolved)
  await expect(html).toHaveCSS(
    'background-color',
    resolved === 'dark' ? 'rgb(23, 23, 23)' : 'rgb(255, 255, 255)',
  )
}

export async function openApp(page: Page): Promise<void> {
  await page.goto('/')
  // Saved Dark differs from the SSR default, so this also waits for hydration.
  await expectTheme(page, 'dark', 'dark')
}
