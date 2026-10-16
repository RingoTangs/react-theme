import path from 'node:path'
import process from 'node:process'
import { defineConfig } from 'tsdown'
import pkg from './package.json' with { type: 'json' }

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  entry: { index: './src/index.ts', vite: './src/vite.ts' },
  outDir: 'dist',
  tsconfig: './tsconfig.build.json',
  alias: {
    '@': path.resolve(import.meta.dirname, './src'),
  },
  clean: true,
  dts: true,
  format: ['cjs', 'esm'],
  deps: {
    neverBundle: [/^react(?:\/|$)/, /^vite(?:\/|$)/],
  },
  banner: `/*! ${pkg.name} v${pkg.version} */`,
  platform: 'browser',
  minify: isProd,
  publint: isProd,
  attw: {
    enabled: isProd,
    profile: 'node16',
    level: 'error',
  },
})
