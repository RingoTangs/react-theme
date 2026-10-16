import type { ResolvedTheme, ThemeMode } from './theme'
import { createContext } from 'react'

/** Theme state and controls returned by `useTheme`. */
export interface ThemeContextValue {
  /** Selected mode, which can be `'system'` rather than an actual color scheme. */
  theme: ThemeMode
  /** Actual color scheme; initially `'light'` when the selected mode is `'system'`. */
  resolvedTheme: ResolvedTheme
  /** Update the selected mode and persist it when localStorage is available. */
  setTheme: (theme: ThemeMode) => void
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
)
