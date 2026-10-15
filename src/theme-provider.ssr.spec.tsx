import type { ThemeMode } from './index'
// @vitest-environment node
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ThemeProvider, useTheme } from './index'

describe('ssr theme provider', () => {
  it.each(['system', 'dark', 'light'] as ThemeMode[])(
    'renders %s without browser globals',
    (defaultTheme) => {
      function Consumer(): string {
        const { theme, resolvedTheme } = useTheme()
        return `${theme}/${resolvedTheme}`
      }
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
