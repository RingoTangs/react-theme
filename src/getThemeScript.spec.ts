import { runInNewContext } from 'node:vm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getThemeScript, SYSTEM_THEME_QUERY, themeModes } from './index'

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.className = 'existing dark'
  document.documentElement.style.cssText = 'color: red; color-scheme: dark;'
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function expectTheme(dark: boolean): void {
  expect(document.documentElement.classList.contains('dark')).toBe(dark)
  expect(document.documentElement.style.colorScheme).toBe(
    dark ? 'dark' : 'light',
  )
  expect(document.documentElement).toHaveClass('existing')
  expect(document.documentElement.style.color).toBe('red')
}

describe('getThemeScript', () => {
  it.each(themeModes)(
    'applies a custom class for %s without modifying other classes',
    (defaultTheme) => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }))
      runInNewContext(
        getThemeScript({ defaultTheme, darkClassName: 'theme-dark' }),
        { window, document },
      )
      expect(document.documentElement.classList.contains('theme-dark')).toBe(
        defaultTheme !== 'light',
      )
      expect(document.documentElement).toHaveClass('existing', 'dark')
      expect(document.documentElement.style.colorScheme).toBe(
        defaultTheme === 'light' ? 'light' : 'dark',
      )
    },
  )

  it.each([
    'theme-dark',
    'theme"\'\\<>&',
    '</script><script>globalThis.injected=true</script>',
  ])('safely serializes the original class token %j', (darkClassName) => {
    const context = { window, document, injected: false }
    const script = getThemeScript({ defaultTheme: 'dark', darkClassName })
    expect(script).not.toContain('<')
    runInNewContext(script, context)
    expect(document.documentElement.classList.contains(darkClassName)).toBe(
      true,
    )
    expect(document.documentElement).toHaveClass('existing', 'dark')
    expect(context.injected).toBe(false)
    const head = document.createElement('head')
    head.innerHTML = `<script>${script}</script>`
    expect(head.children).toHaveLength(1)
    expect(head.firstElementChild?.textContent).toBe(script)
    runInNewContext(
      getThemeScript({ defaultTheme: 'light', darkClassName }),
      context,
    )
    expect(document.documentElement.classList.contains(darkClassName)).toBe(
      false,
    )
    expect(document.documentElement).toHaveClass('existing', 'dark')
  })

  it.each([
    '',
    ' ',
    ' leading',
    'trailing ',
    'two classes',
    'a\tb',
    'a\nb',
    'a\rb',
    'a\fb',
    '\u00A0',
    '\u2028',
    '\u2029',
    null,
    42,
  ])('rejects invalid darkClassName %j at generation time', (darkClassName) => {
    expect(() =>
      getThemeScript({ darkClassName: darkClassName as string }),
    ).toThrowError(
      new TypeError(
        'darkClassName must be a non-empty string without whitespace',
      ),
    )
  })

  for (const defaultTheme of themeModes) {
    for (const stored of [null, 'invalid', ...themeModes]) {
      it.each([false, true])(
        `resolves default=${defaultTheme}, stored=${stored}, system dark=%s`,
        (systemDark) => {
          if (stored !== null) window.localStorage.setItem('custom', stored)
          const matchMedia = vi.fn(() => ({ matches: systemDark }))
          vi.stubGlobal('matchMedia', matchMedia)
          const write = vi.spyOn(Storage.prototype, 'setItem')
          const mode =
            stored === 'light' || stored === 'dark' || stored === 'system'
              ? stored
              : defaultTheme
          runInNewContext(
            getThemeScript({ defaultTheme, storageKey: 'custom' }),
            { window, document },
          )
          expectTheme(mode === 'dark' || (mode === 'system' && systemDark))
          expect(write).not.toHaveBeenCalled()
          if (mode === 'system')
            expect(matchMedia).toHaveBeenCalledWith(SYSTEM_THEME_QUERY)
          else expect(matchMedia).not.toHaveBeenCalled()
        },
      )
    }
  }

  it('defaults to system and the theme key without writing', () => {
    window.localStorage.setItem('theme', 'dark')
    const write = vi.spyOn(Storage.prototype, 'setItem')
    runInNewContext(getThemeScript(), { window, document })
    expectTheme(true)
    expect(write).not.toHaveBeenCalled()
  })

  it.each(['missing', 'access throws', 'read throws'])(
    'handles storage: %s',
    (kind) => {
      const write = vi.fn()
      const browser = {
        matchMedia: () => ({ matches: true }),
        get localStorage() {
          if (kind === 'access throws') throw new Error('denied')
          if (kind === 'missing') return undefined
          return {
            getItem: () => {
              throw new Error('denied')
            },
            setItem: write,
          }
        },
      }
      runInNewContext(getThemeScript(), { window: browser, document })
      expectTheme(true)
      runInNewContext(getThemeScript({ defaultTheme: 'light' }), {
        window: browser,
        document,
      })
      expectTheme(false)
      runInNewContext(getThemeScript({ defaultTheme: 'dark' }), {
        window: browser,
        document,
      })
      expectTheme(true)
      expect(write).not.toHaveBeenCalled()
    },
  )

  it.each(['missing', 'access throws', 'call throws'])(
    'handles matchMedia: %s',
    (kind) => {
      const browser = {
        localStorage: window.localStorage,
        get matchMedia() {
          if (kind === 'access throws') throw new Error('unavailable')
          if (kind === 'missing') return undefined
          return () => {
            throw new Error('unavailable')
          }
        },
      }
      const write = vi.spyOn(Storage.prototype, 'setItem')
      runInNewContext(getThemeScript(), { window: browser, document })
      expectTheme(false)
      runInNewContext(getThemeScript({ defaultTheme: 'dark' }), {
        window: browser,
        document,
      })
      expectTheme(true)
      expect(write).not.toHaveBeenCalled()
    },
  )

  it.each([
    'quotes"\' and \\ backslash\nnewline',
    '</script><script>globalThis.injected=true</script>',
    '<!-- & > \u2028\u2029',
    '\");globalThis.injected=true;//',
    '',
  ])('safely serializes the original storage key %j', (storageKey) => {
    const getItem = vi.fn(() => 'dark')
    const setItem = vi.fn()
    const context = {
      window: { localStorage: { getItem, setItem } },
      document,
      injected: false,
    }
    const script = getThemeScript({ storageKey })
    expect(script).not.toMatch(/[<\u2028\u2029]/)
    if (storageKey.includes('&')) expect(script).toContain('\\u0026')
    if (storageKey.includes('>')) expect(script).toContain('\\u003e')
    runInNewContext(script, context)
    expect(getItem).toHaveBeenCalledWith(storageKey)
    expect(context.injected).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
    expectTheme(true)

    const head = document.createElement('head')
    head.innerHTML = `<script>${script}</script>`
    expect(head.children).toHaveLength(1)
    expect(head.firstElementChild?.tagName).toBe('SCRIPT')
    expect(head.firstElementChild?.textContent).toBe(script)
  })
})
