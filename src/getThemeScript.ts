import type { ThemeMode } from './theme'
import { DEFAULT_DARK_CLASS_NAME, validateDarkClassName } from './darkClassName'
import { SYSTEM_THEME_QUERY, THEME_STORAGE_KEY, themeModes } from './theme'

/** Initialization options shared by `getThemeScript` and the Vite plugin. */
export interface ThemeScriptOptions {
  /**
   * Fallback mode when no valid stored preference exists.
   * System detection falls back to `'light'` when unavailable.
   * @default 'system'
   */
  defaultTheme?: ThemeMode
  /**
   * localStorage key used to read the saved theme mode.
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

function serialize(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * Generate inline JavaScript that applies the theme before the first paint.
 * Place the returned source in a `<script>` in `<head>` and use the same options
 * as `ThemeProvider`. A valid saved mode takes priority over `defaultTheme`.
 * The script updates the `<html>` dark class and CSS `color-scheme`.
 *
 * @param options - Initialization options. Defaults to `{}`; see {@link ThemeScriptOptions} for property defaults.
 * @param options.defaultTheme - Fallback theme mode. Defaults to `'system'`.
 * @param options.storageKey - localStorage key to read. Defaults to `'theme'`.
 * @param options.darkClassName - Dark mode class on `<html>`. Defaults to `'dark'`.
 * @returns Script source without a wrapping `<script>` tag.
 * @throws {TypeError} If `darkClassName` is empty or contains whitespace.
 */
export function getThemeScript({
  defaultTheme = 'system',
  storageKey = THEME_STORAGE_KEY,
  darkClassName = DEFAULT_DARK_CLASS_NAME,
}: ThemeScriptOptions = {}): string {
  validateDarkClassName(darkClassName)
  const storedThemeCheck = themeModes
    .map((mode) => `stored === ${serialize(mode)}`)
    .join(' || ')
  return `(function () {
  var theme = ${serialize(defaultTheme)};
  try {
    var stored = window.localStorage.getItem(${serialize(storageKey)});
    if (${storedThemeCheck}) theme = stored;
  } catch (error) {}
  var dark = theme === 'dark';
  if (theme === 'system') {
    try {
      dark = typeof window.matchMedia === 'function' &&
        !!window.matchMedia(${serialize(SYSTEM_THEME_QUERY)}).matches;
    } catch (error) {}
  }
  if (dark) document.documentElement.classList.add(${serialize(darkClassName)});
  else document.documentElement.classList.remove(${serialize(darkClassName)});
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();`
}
