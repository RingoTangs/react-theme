import type { ReactElement } from 'react'
import { themeModes, useTheme } from '@ringotangs/react-theme'

export function App(): ReactElement {
  const { theme, resolvedTheme, setTheme } = useTheme()

  return (
    <main>
      <h1>React SPA</h1>
      <p>Theme: {theme}</p>
      <p>Resolved theme: {resolvedTheme}</p>
      <div role="group" aria-label="Theme">
        {themeModes.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={theme === mode}
            onClick={() => setTheme(mode)}
          >
            {mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System'}
          </button>
        ))}
      </div>
    </main>
  )
}
