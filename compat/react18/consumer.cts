import type { ReactElement, ReactNode } from 'react'
import {
  getThemeScript,
  ThemeProvider,
  useTheme,
} from '@ringotangs/react-theme'
import { createElement } from 'react'

function Consumer(): ReactElement {
  const { theme, resolvedTheme } = useTheme()
  return createElement('span', null, `${theme}/${resolvedTheme}`)
}

const tree: ReactNode = createElement(
  ThemeProvider,
  { darkClassName: 'compat-dark' },
  createElement(Consumer),
)
getThemeScript({ defaultTheme: 'dark' })
void tree
