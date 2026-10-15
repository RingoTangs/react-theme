import { reactTheme } from '@ringotangs/react-theme/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { themeOptions } from './src/theme-options.ts'

export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom'] },
  plugins: [react(), reactTheme(themeOptions)],
})
