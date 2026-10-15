export const THEME_STORAGE_KEY = 'theme'
export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

export const themeModes = ['light', 'dark', 'system'] as const

export type ThemeMode = (typeof themeModes)[number]
export type ResolvedTheme = Exclude<ThemeMode, 'system'>

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && themeModes.includes(value as ThemeMode)
}

export function getSystemTheme(): ResolvedTheme {
  try {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(SYSTEM_THEME_QUERY).matches
      ? 'dark'
      : 'light'
  } catch {
    return 'light'
  }
}

export function readStoredTheme(storageKey = THEME_STORAGE_KEY): ThemeMode {
  try {
    if (typeof window === 'undefined') return 'system'
    const storedTheme = window.localStorage.getItem(storageKey)
    return isThemeMode(storedTheme) ? storedTheme : 'system'
  } catch {
    return 'system'
  }
}

export function persistTheme(
  theme: ThemeMode,
  storageKey = THEME_STORAGE_KEY,
): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, theme)
  } catch {
    // Storage failures must not prevent changing the theme in memory.
  }
}
