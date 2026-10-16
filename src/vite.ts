import type { Plugin } from 'vite'
import type { ThemeScriptOptions } from './getThemeScript'
import { getThemeScript } from './getThemeScript'

export type { ThemeScriptOptions } from './getThemeScript'

const themeScriptId = 'react-theme-script'
const existingScript =
  /<script\b[^>]*\sid\s*=\s*(?:"react-theme-script"|'react-theme-script'|react-theme-script(?=[\s>]))/i

/**
 * Inject the theme initialization script at the start of the SPA's `<head>` before first paint.
 * Use the same options as `ThemeProvider`. Skips injection when a script with
 * the ID `react-theme-script` already exists.
 *
 * @param options - Initialization options. Defaults to `{}`; see {@link ThemeScriptOptions} for property defaults.
 * @throws {TypeError} If an injected script's `darkClassName` is empty or contains whitespace.
 */
export function reactTheme(options: ThemeScriptOptions = {}): Plugin {
  return {
    name: 'vite-plugin-react-theme',
    transformIndexHtml(html) {
      if (existingScript.test(html)) return
      return [
        {
          tag: 'script',
          attrs: { id: themeScriptId },
          children: getThemeScript(options),
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}
