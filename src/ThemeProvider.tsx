import type { ReactElement, ReactNode } from 'react'
import type { ResolvedTheme, ThemeMode } from './theme'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_DARK_CLASS_NAME, validateDarkClassName } from './darkClassName'
import {
  getSystemTheme,
  isThemeMode,
  persistTheme,
  readStoredTheme,
  SYSTEM_THEME_QUERY,
  THEME_STORAGE_KEY,
} from './theme'
import { ThemeContext } from './ThemeContext'

/** Configuration for theme state, persistence, and the document's dark class. */
export interface ThemeProviderProps {
  /** Content that can access the theme through `useTheme`. */
  children?: ReactNode
  /**
   * Initial mode and fallback when no valid stored preference exists.
   * A valid stored mode takes priority after mounting.
   * @default 'system'
   */
  defaultTheme?: ThemeMode
  /**
   * localStorage key used to read, persist, and synchronize the selected mode across tabs.
   * @default 'theme'
   */
  storageKey?: string
  /**
   * Class toggled on `<html>` for dark mode; must be non-empty and contain no whitespace.
   * Update your CSS selector to match a custom class name.
   * @default 'dark'
   */
  darkClassName?: string
}

/**
 * Provide theme state and synchronize the `<html>` dark class and CSS `color-scheme`.
 * The server and first client render use `defaultTheme`, with `'system'` resolving
 * to `'light'`. Stored preferences and the system color scheme are restored after mounting.
 * Storage failures do not prevent theme changes in memory.
 *
 * @throws {TypeError} If `darkClassName` is empty or contains whitespace.
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = THEME_STORAGE_KEY,
  darkClassName = DEFAULT_DARK_CLASS_NAME,
}: ThemeProviderProps): ReactElement {
  validateDarkClassName(darkClassName)
  const previousDarkClassNameRef = useRef(darkClassName)
  // 首次渲染只使用默认主题；两端传入相同配置，保证 SSR 与客户端水合内容一致。
  const [state, setState] = useState(() => ({
    theme: defaultTheme,
    storageKey,
    defaultTheme,
    initialized: false,
  }))
  // 服务端无法获知系统配色，两端首次都将 system 解析为 light。
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light')
  const current =
    state.storageKey === storageKey && state.defaultTheme === defaultTheme
  const theme = current ? state.theme : defaultTheme
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    // 挂载后再恢复存储偏好，使主题变化成为水合后的正常更新。
    // eslint-disable-next-line react/set-state-in-effect -- Restore browser preferences only after the deterministic hydration render.
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
    // 系统配色同样延后读取，避免客户端首次渲染与服务端不同。
    // eslint-disable-next-line react/set-state-in-effect -- Detect browser preferences after the shared server/client initial render.
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
    // 等待当前配置的偏好恢复，避免初始默认值覆盖首屏脚本已应用的配色。
    if (!current || !state.initialized) return
    const root = document.documentElement
    if (previousDarkClassNameRef.current !== darkClassName) {
      root.classList.remove(previousDarkClassNameRef.current)
    }
    root.classList.toggle(darkClassName, resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
    previousDarkClassNameRef.current = darkClassName
  }, [current, state.initialized, resolvedTheme, darkClassName])

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

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
