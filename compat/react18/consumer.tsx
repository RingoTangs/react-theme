import type {
  ThemeProviderProps,
  ThemeScriptOptions,
} from '@ringotangs/react-theme'
import type { ReactElement } from 'react'
import {
  getThemeScript,
  ThemeProvider,
  useTheme,
} from '@ringotangs/react-theme'

const options: ThemeScriptOptions = {
  defaultTheme: 'system',
  storageKey: 'compat-theme',
  darkClassName: 'compat-dark',
}

export function Consumer(): ReactElement {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <button onClick={() => setTheme('dark')}>
      {theme}/{resolvedTheme}
    </button>
  )
}

const props: ThemeProviderProps = options
const tree: ReactElement = (
  <ThemeProvider {...props}>
    <Consumer />
  </ThemeProvider>
)
getThemeScript(options)
void tree

// @ts-expect-error Unknown theme modes must remain invalid.
getThemeScript({ defaultTheme: 'invalid' })
