import type { ThemeMode } from './theme'
import { DEFAULT_DARK_CLASS_NAME, validateDarkClassName } from './darkClassName'
import { SYSTEM_THEME_QUERY, THEME_STORAGE_KEY, themeModes } from './theme'

export interface ThemeScriptOptions {
  defaultTheme?: ThemeMode
  storageKey?: string
  darkClassName?: string
}

function serialize(value: string | readonly string[]): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export function getThemeScript({
  defaultTheme = 'system',
  storageKey = THEME_STORAGE_KEY,
  darkClassName = DEFAULT_DARK_CLASS_NAME,
}: ThemeScriptOptions = {}): string {
  validateDarkClassName(darkClassName)
  return `(() => {
  let theme = ${serialize(defaultTheme)};
  try {
    const stored = window.localStorage.getItem(${serialize(storageKey)});
    if (${serialize(themeModes)}.includes(stored)) theme = stored;
  } catch {}
  let dark = theme === 'dark';
  if (theme === 'system') {
    try {
      dark = typeof window.matchMedia === 'function' &&
        !!window.matchMedia(${serialize(SYSTEM_THEME_QUERY)}).matches;
    } catch {}
  }
  document.documentElement.classList.toggle(${serialize(darkClassName)}, dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();`
}
