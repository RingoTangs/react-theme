import { reactTheme } from '@ringotangs/react-theme/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { themeOptions } from './src/theme-options.ts'

export default defineConfig({
  plugins: [react(), reactTheme(themeOptions)],
})
