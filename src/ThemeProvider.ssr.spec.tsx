import type { ThemeMode } from './index'
// @vitest-environment node
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getThemeScript, ThemeProvider, useTheme } from './index'

function Consumer(): string {
  const { theme, resolvedTheme } = useTheme()
  return `${theme}/${resolvedTheme}`
}

describe('ssr theme provider', () => {
  it('supports a custom class without browser globals', () => {
    expect(
      renderToString(
        createElement(
          ThemeProvider,
          { darkClassName: 'theme-dark' },
          createElement(Consumer),
        ),
      ),
    ).toBe('system/light')
    expect(getThemeScript({ darkClassName: 'theme-dark' })).toContain(
      '"theme-dark"',
    )
  })

  it('rejects an invalid class during server rendering', () => {
    expect(() =>
      renderToString(createElement(ThemeProvider, { darkClassName: '' })),
    ).toThrowError(TypeError)
  })
  it('generates an inline script without browser globals', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
    expect(getThemeScript()).toContain('document.documentElement')
    expect(getThemeScript()).not.toContain('<script')
  })
  it.each(['system', 'dark', 'light'] as ThemeMode[])(
    'renders %s without browser globals',
    (defaultTheme) => {
      expect(typeof window).toBe('undefined')
      expect(
        renderToString(
          createElement(
            ThemeProvider,
            { defaultTheme },
            createElement(Consumer),
          ),
        ),
      ).toBe(
        `${defaultTheme}/${defaultTheme === 'system' ? 'light' : defaultTheme}`,
      )
    },
  )
})
