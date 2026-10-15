import type { ThemeScriptOptions } from '@ringotangs/react-theme/vite'
import type { Plugin } from 'vite'
import { reactTheme } from '@ringotangs/react-theme/vite'
import { defineConfig } from 'vite'

const options: ThemeScriptOptions = {
  defaultTheme: 'system',
  storageKey: 'compat-theme',
  darkClassName: 'theme-dark',
}
const plugin: Plugin = reactTheme(options)
defineConfig({ plugins: [plugin, reactTheme()] })
// @ts-expect-error Only supported theme modes are accepted.
reactTheme({ defaultTheme: 'invalid' })
