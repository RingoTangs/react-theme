import {
  expect,
  expectTheme,
  openApp,
  test,
  themeButton,
} from './theme.fixture'

test('the server returns the rendered page and head initialization script', async ({
  request,
}) => {
  const response = await request.get('/')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('text/html')
  const html = await response.text()
  expect(html).toContain('<h1>TanStack Start SSR</h1>')
  expect(html).toMatch(/Theme: <!-- -->system/)
  expect(html).toMatch(/Resolved theme: <!-- -->light/)
  expect(html.match(/<button\b/g)).toHaveLength(3)
  const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1]
  expect(head).toContain('localStorage.getItem("theme")')
  expect(head).toContain('document.documentElement.classList.add')
  expect(head).toContain('document.documentElement.classList.remove')
})

test('hydration restores the saved preference without errors or storage writes', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.addInitScript(() => {
    const writes: string[] = []
    Object.assign(window, { themeStorageWrites: writes })
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value): void {
      if (this === window.localStorage && key === 'theme') writes.push(value)
      original.call(this, key, value)
    }
  })
  await openApp(page)
  expect(
    await page.evaluate(() => Reflect.get(window, 'themeStorageWrites')),
  ).toEqual([])
  await themeButton(page, 'light').click()
  await expectTheme(page, 'light', 'light')
  expect(
    await page.evaluate(() => Reflect.get(window, 'themeStorageWrites')),
  ).toEqual(['light'])
  await page.reload()
  await expectTheme(page, 'light', 'light')
  expect(
    await page.evaluate(() => Reflect.get(window, 'themeStorageWrites')),
  ).toEqual([])
  expect(errors).toEqual([])
})
