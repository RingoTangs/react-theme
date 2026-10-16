import type { ReactElement } from 'react'
import { themeModes, useTheme } from '@ringotangs/react-theme'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home(): ReactElement {
  const { theme, resolvedTheme, setTheme } = useTheme()

  return (
    <main>
      <h1>TanStack Start SSR</h1>
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
