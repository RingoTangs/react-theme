import type { ReactElement, ReactNode } from 'react'
import type { ResolvedTheme, ThemeMode } from './theme'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getSystemTheme,
  isThemeMode,
  persistTheme,
  readStoredTheme,
  SYSTEM_THEME_QUERY,
  THEME_STORAGE_KEY,
} from './theme'
import { ThemeContext } from './ThemeContext'

export interface ThemeProviderProps {
  children?: ReactNode
  defaultTheme?: ThemeMode
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps): ReactElement {
  const [state, setState] = useState(() => ({
    theme: defaultTheme,
    storageKey,
    defaultTheme,
    initialized: false,
  }))
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light')
  const current =
    state.storageKey === storageKey && state.defaultTheme === defaultTheme
  const theme = current ? state.theme : defaultTheme
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    // Restore preferences only after the deterministic hydration render.
    setState({
      theme: readStoredTheme(storageKey, defaultTheme),
      storageKey,
      defaultTheme,
      initialized: true,
    })
    const syncTheme = (event: StorageEvent): void => {
      if (event.key !== null && event.key !== storageKey) return
      try {
        if (event.storageArea && event.storageArea !== window.localStorage)
          return
      } catch {
        return
      }
      setState({
        theme: isThemeMode(event.newValue) ? event.newValue : defaultTheme,
        storageKey,
        defaultTheme,
        initialized: true,
      })
    }
    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [storageKey, defaultTheme])

  useEffect(() => {
    setSystemTheme(getSystemTheme())
    try {
      const media = window.matchMedia?.(SYSTEM_THEME_QUERY)
      if (!media || typeof media.addEventListener !== 'function') return
      const update = (event: MediaQueryListEvent): void =>
        setSystemTheme(event.matches ? 'dark' : 'light')
      media.addEventListener('change', update)
      return () => {
        try {
          media.removeEventListener?.('change', update)
        } catch {
          // Some environments expose media APIs without working subscriptions.
        }
      }
    } catch {
      // Manual theme selection still works without media subscriptions.
    }
  }, [])

  useEffect(() => {
    if (!current || !state.initialized) return
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
    document.documentElement.style.colorScheme = resolvedTheme
  }, [current, state.initialized, resolvedTheme])

  const setTheme = useCallback(
    (nextTheme: ThemeMode) => {
      setState({
        theme: nextTheme,
        storageKey,
        defaultTheme,
        initialized: true,
      })
      persistTheme(nextTheme, storageKey)
    },
    [storageKey, defaultTheme],
  )
  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
