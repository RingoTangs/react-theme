import { ThemeProvider } from '@ringotangs/react-theme'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { themeOptions } from './theme-options'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider {...themeOptions}>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
