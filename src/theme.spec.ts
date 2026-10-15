import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getSystemTheme,
  isThemeMode,
  persistTheme,
  readStoredTheme,
  SYSTEM_THEME_QUERY,
  THEME_STORAGE_KEY,
  themeModes,
} from './index'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('isThemeMode', () => {
  it.each(themeModes)('accepts %s', (theme) => {
    expect(isThemeMode(theme)).toBe(true)
  })

  it.each(['', 'unknown', 'Dark', ' light ', null, undefined, 1, true, {}, []])(
    'rejects %j',
    (value) => {
      expect(isThemeMode(value)).toBe(false)
    },
  )
})

describe('getSystemTheme', () => {
  it.each([
    [true, 'dark'],
    [false, 'light'],
  ] as const)('resolves matches=%s to %s', (matches, expected) => {
    const matchMedia = vi.fn(() => ({ matches }))
    vi.stubGlobal('matchMedia', matchMedia)

    expect(getSystemTheme()).toBe(expected)
    expect(matchMedia).toHaveBeenCalledWith(SYSTEM_THEME_QUERY)
  })

  it('falls back when matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(getSystemTheme()).toBe('light')
  })

  it('falls back when matchMedia throws', () => {
    vi.stubGlobal('matchMedia', () => {
      throw new Error('Unavailable')
    })
    expect(getSystemTheme()).toBe('light')
  })

  it('falls back when accessing matchMedia throws', () => {
    vi.stubGlobal('window', {
      get matchMedia() {
        throw new Error('Unavailable')
      },
    })
    expect(getSystemTheme()).toBe('light')
  })
})

describe('theme storage', () => {
  it('uses an optional fallback while preserving valid stored system', () => {
    expect(readStoredTheme('custom', 'dark')).toBe('dark')
    window.localStorage.setItem('custom', 'invalid')
    expect(readStoredTheme('custom', 'light')).toBe('light')
    window.localStorage.setItem('custom', 'system')
    expect(readStoredTheme('custom', 'dark')).toBe('system')
  })

  it('uses the configured fallback when storage is inaccessible', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('Access denied')
    })
    expect(readStoredTheme('custom', 'dark')).toBe('dark')
  })
  it.each(themeModes)('round-trips %s with the default key', (theme) => {
    persistTheme(theme)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(theme)
    expect(readStoredTheme()).toBe(theme)
  })

  it.each(themeModes)('round-trips %s with a custom key', (theme) => {
    persistTheme(theme, 'app-theme')
    expect(window.localStorage.getItem('app-theme')).toBe(theme)
    expect(readStoredTheme('app-theme')).toBe(theme)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('defaults to system for a missing value without writing it', () => {
    expect(readStoredTheme()).toBe('system')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it.each(['', 'invalid', 'DARK', ' light ', 'null'])(
    'defaults to system for %j without rewriting it',
    (value) => {
      window.localStorage.setItem(THEME_STORAGE_KEY, value)
      expect(readStoredTheme()).toBe('system')
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(value)
    },
  )

  it('handles unavailable localStorage', () => {
    vi.spyOn(window, 'localStorage', 'get').mockReturnValue(
      undefined as unknown as Storage,
    )
    expect(readStoredTheme()).toBe('system')
    expect(() => persistTheme('dark')).not.toThrow()
  })

  it('handles errors accessing localStorage', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('Access denied')
    })
    expect(readStoredTheme()).toBe('system')
    expect(() => persistTheme('dark')).not.toThrow()
  })

  it('handles read errors', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Read failed')
    })
    expect(readStoredTheme()).toBe('system')
  })

  it('handles write errors', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded')
    })
    expect(() => persistTheme('dark')).not.toThrow()
  })
})

describe('ssr', () => {
  it('supports importing and calling the core without window', async () => {
    vi.stubGlobal('window', undefined)
    vi.resetModules()
    const core = await import('./index')

    expect(core.isThemeMode('system')).toBe(true)
    expect(core.getSystemTheme()).toBe('light')
    expect(core.readStoredTheme()).toBe('system')
    expect(core.readStoredTheme('custom', 'dark')).toBe('dark')
    expect(() => core.persistTheme('dark')).not.toThrow()
  })
})
