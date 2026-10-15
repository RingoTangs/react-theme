import type { Plugin } from 'vite'
import type { ThemeScriptOptions } from './getThemeScript'
import { getThemeScript } from './getThemeScript'

export type { ThemeScriptOptions } from './getThemeScript'

const themeScriptId = 'react-theme-script'
const existingScript =
  /<script\b[^>]*\sid\s*=\s*(?:"react-theme-script"|'react-theme-script'|react-theme-script(?=[\s>]))/i

/** Inject the theme initialization script before the SPA's first paint. */
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
