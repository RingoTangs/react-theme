export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeTestOptions {
  storedTheme: ThemeMode | null
  darkClassName: string
  reactVersion: string
}
