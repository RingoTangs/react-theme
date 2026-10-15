import type { ThemeContextValue } from './ThemeContext'
import { useContext } from 'react'
import { ThemeContext } from './ThemeContext'

export function useTheme(): ThemeContextValue {
  // eslint-disable-next-line react/no-use-context -- useContext supports both React 18 and React 19.
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
