import type { ThemeContextValue } from './ThemeContext'
import { useContext } from 'react'
import { ThemeContext } from './ThemeContext'

/**
 * Read the selected mode, resolved color scheme, and theme setter from `ThemeProvider`.
 *
 * @throws {Error} If called outside a `ThemeProvider`.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
