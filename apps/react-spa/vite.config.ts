import { getThemeScript } from '@ringotangs/react-theme'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { themeOptions } from './src/theme-options.ts'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'theme-initialization',
      transformIndexHtml() {
        return [
          {
            tag: 'script',
            children: getThemeScript(themeOptions),
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  ],
})
