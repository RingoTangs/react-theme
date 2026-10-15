import {
  expect,
  expectRootTheme,
  expectTheme,
  openApp,
  test,
  themeButton,
} from './theme.fixture'

for (const mode of ['light', 'dark', 'system'] as const) {
  test(`${mode} selection persists across reload`, async ({
    page,
    darkClassName,
  }) => {
    await openApp(page, darkClassName)
    await themeButton(page, mode).click()
    const resolved = mode === 'dark' ? 'dark' : 'light'
    await expectTheme(page, mode, resolved, darkClassName)
    await page.reload()
    await expectTheme(page, mode, resolved, darkClassName)
    if (mode !== 'system') {
      await page.emulateMedia({
        colorScheme: resolved === 'dark' ? 'light' : 'dark',
      })
      await expectTheme(page, mode, resolved, darkClassName)
    }
  })
}

test('System follows changes to the system color scheme', async ({
  page,
  darkClassName,
}) => {
  await openApp(page, darkClassName)
  await themeButton(page, 'system').click()
  await expectTheme(page, 'system', 'light', darkClassName)
  await page.emulateMedia({ colorScheme: 'dark' })
  await expectTheme(page, 'system', 'dark', darkClassName)
  await page.reload()
  await expectTheme(page, 'system', 'dark', darkClassName)
  await page.emulateMedia({ colorScheme: 'light' })
  await expectTheme(page, 'system', 'light', darkClassName)
})

test('theme changes synchronize between tabs', async ({
  page,
  context,
  darkClassName,
}) => {
  await openApp(page, darkClassName)
  const other = await context.newPage()
  await openApp(other, darkClassName)
  await themeButton(page, 'light').click()
  await expectTheme(page, 'light', 'light', darkClassName)
  await expectTheme(other, 'light', 'light', darkClassName)
  await themeButton(other, 'dark').click()
  await expectTheme(other, 'dark', 'dark', darkClassName)
  await expectTheme(page, 'dark', 'dark', darkClassName)
  await themeButton(page, 'system').click()
  await expectTheme(page, 'system', 'light', darkClassName)
  await expectTheme(other, 'system', 'light', darkClassName)
})

for (const scenario of [
  { stored: 'light', system: 'dark', resolved: 'light' },
  { stored: 'dark', system: 'light', resolved: 'dark' },
  { stored: 'system', system: 'light', resolved: 'light' },
  { stored: 'system', system: 'dark', resolved: 'dark' },
] as const) {
  test.describe(`before React: saved ${scenario.stored}, system ${scenario.system}`, () => {
    test.use({ storedTheme: scenario.stored, colorScheme: scenario.system })

    test('the head script applies the theme without client modules', async ({
      page,
      darkClassName,
    }) => {
      const blockedScripts: string[] = []
      await page.route('**/*', async (route) => {
        if (route.request().resourceType() === 'script') {
          blockedScripts.push(route.request().url())
          await route.abort()
        } else {
          await route.continue()
        }
      })
      await page.goto('/')
      expect(blockedScripts.length).toBeGreaterThan(0)
      // Playwright's text engine ignores script contents; read textContent directly.
      const scripts = await page
        .locator('head script')
        .evaluateAll((elements) =>
          elements
            .filter((element) =>
              element.textContent?.includes('localStorage.getItem'),
            )
            .map((element) =>
              ['src', 'async', 'defer', 'type'].map((name) =>
                element.getAttribute(name),
              ),
            ),
        )
      expect(scripts).toEqual([[null, null, null, null]])
      await expectRootTheme(page, scenario.resolved, darkClassName)
      expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(
        scenario.stored,
      )
    })
  })
}
