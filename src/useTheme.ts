import type { ThemeContextValue } from './ThemeContext'
import { use } from 'react'
import { ThemeContext } from './ThemeContext'

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
