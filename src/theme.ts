/** Default localStorage key used to persist the selected theme: `'theme'`. */
export const THEME_STORAGE_KEY = 'theme'
/** Media query used to detect the system's dark color scheme preference. */
export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

/** Supported theme modes, including automatic system preference detection. */
export const themeModes = ['light', 'dark', 'system'] as const

/** A selected theme mode; `'system'` follows the operating system preference. */
export type ThemeMode = (typeof themeModes)[number]
/** The actual color scheme after resolving the selected theme mode. */
export type ResolvedTheme = Exclude<ThemeMode, 'system'>

/** Check whether a value is one of the supported theme modes. */
export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && themeModes.includes(value as ThemeMode)
}

/** Detect the system color scheme, falling back to `'light'` during SSR or when detection fails. */
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

/**
 * Read a valid theme mode from localStorage.
 * Returns the fallback when storage is missing, invalid, or unavailable, including during SSR.
 *
 * @param storageKey - localStorage key to read. Defaults to `'theme'`.
 * @param fallback - Theme mode to use without a valid stored value. Defaults to `'system'`.
 */
export function readStoredTheme(
  storageKey = THEME_STORAGE_KEY,
  fallback: ThemeMode = 'system',
): ThemeMode {
  try {
    if (typeof window === 'undefined') return fallback
    const storedTheme = window.localStorage.getItem(storageKey)
    return isThemeMode(storedTheme) ? storedTheme : fallback
  } catch {
    return fallback
  }
}

/**
 * Save a theme mode to localStorage; does nothing during SSR and ignores storage failures.
 * Does not update React state or the document's color scheme.
 *
 * @param theme - Theme mode to save.
 * @param storageKey - localStorage key to write. Defaults to `'theme'`.
 */
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
