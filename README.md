# @ringotangs/react-theme

Lightweight theme management for React 18.2 and React 19.

English | [简体中文](./README.zh-CN.md)

- Light, dark, and system modes.
- Saved preferences, system updates, and cross-tab synchronization.
- SSR support with a script to initialize the theme before the first paint.
- TypeScript types and ESM/CJS output.

## Installation

Requires React `^18.2.0 || ^19.0.0`:

```sh
pnpm add @ringotangs/react-theme
```

## Quick start

Wrap your application in `ThemeProvider` and call `useTheme` inside it:

```tsx
import { ThemeProvider, useTheme } from '@ringotangs/react-theme'

function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  return (
    <section>
      <p>
        {theme} / {resolvedTheme}
      </p>
      <button type="button" onClick={() => setTheme('light')}>
        Light
      </button>
      <button type="button" onClick={() => setTheme('dark')}>
        Dark
      </button>
      <button type="button" onClick={() => setTheme('system')}>
        System
      </button>
    </section>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ThemeSwitcher />
    </ThemeProvider>
  )
}
```

By default, the provider toggles the `dark` class on `document.documentElement` and sets its `style.colorScheme` to `light` or `dark`. It preserves other classes and styles. Supply your own application colors, for example:

```css
:root {
  background: white;
  color: #171717;
}

:root.dark {
  background: #171717;
  color: white;
}
```

## Configuration and API

### ThemeProvider

| Property        | Type                            | Default    |
| --------------- | ------------------------------- | ---------- |
| `defaultTheme`  | `'light' \| 'dark' \| 'system'` | `'system'` |
| `storageKey`    | `string`                        | `'theme'`  |
| `darkClassName` | `string`                        | `'dark'`   |

A valid saved mode takes priority over `defaultTheme`. Otherwise, the default is used. System detection falls back to light when unavailable. Storage failures do not prevent switching themes on the current page.

`darkClassName` must be a single non-empty class name without whitespace, such as `theme-dark`; invalid values throw a `TypeError`. Update your CSS selector when using a custom class name.

### useTheme

| Value            | Meaning                                                           |
| ---------------- | ----------------------------------------------------------------- |
| `theme`          | Selected mode: `light`, `dark`, or `system`                       |
| `resolvedTheme`  | Actual theme: `light` or `dark`                                   |
| `setTheme(mode)` | Switches and saves the mode; does not accept a functional updater |

For example, when following a dark system preference, `theme` is `system` and `resolvedTheme` is `dark`. Calling the hook outside `ThemeProvider` throws an error.

### getThemeScript

`getThemeScript(options?)` returns JavaScript without `<script>` tags and can be called on the server. Its options and defaults match `ThemeProvider`.

The script applies the root class and color scheme before the first paint without writing storage. Use the plugin below for Vite, or place the script in the document `<head>` for SSR.

### Other exports

- Types: `ThemeMode`, `ResolvedTheme`, `ThemeProviderProps`, `ThemeContextValue`, `ThemeScriptOptions`.
- Constants: `themeModes`, `THEME_STORAGE_KEY` (`theme`), `SYSTEM_THEME_QUERY`.
- Helpers: `isThemeMode(value)`, `getSystemTheme()`, `readStoredTheme(storageKey?, fallback?)`, `persistTheme(theme, storageKey?)`.

`readStoredTheme` defaults to the key `theme` and fallback `system`. Helpers do not change page styles.

## Vite

Supports Vite `^5.1.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`. Use the `reactTheme` plugin to apply the theme before the first paint and reduce theme flashes on reload.

Create shared options so the plugin and provider use the same configuration:

```ts
// src/theme-options.ts
import type { ThemeScriptOptions } from '@ringotangs/react-theme'

export const themeOptions = {
  defaultTheme: 'system',
  storageKey: 'app-theme',
} satisfies ThemeScriptOptions
```

```ts
// vite.config.ts
import { reactTheme } from '@ringotangs/react-theme/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { themeOptions } from './src/theme-options'

export default defineConfig({
  plugins: [react(), reactTheme(themeOptions)],
})
```

Wrap the application at its entry point; `App` should not contain another provider:

```tsx
// src/main.tsx
import { ThemeProvider } from '@ringotangs/react-theme'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { themeOptions } from './theme-options'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider {...themeOptions}>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
```

The plugin works in development and production. No additional manual theme script is needed. See the complete [Vite SPA example](./apps/react-spa).

## SSR

The server and first client render use the same `defaultTheme`. With `system`, the actual theme initially resolves to `light`. After mounting, the provider restores saved preferences and detects the system theme.

To reduce theme flashes, place the script from `getThemeScript()` early in `<head>` so it runs synchronously before the first paint. Use the same configuration for the script and provider. Do not add `async`, `defer`, or `type="module"`.

This TanStack Start root document reuses `src/theme-options.ts` from above:

```tsx
// src/routes/__root.tsx
import type { ReactNode } from 'react'
import { getThemeScript, ThemeProvider } from '@ringotangs/react-theme'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { themeOptions } from '../theme-options'

export const Route = createRootRoute({
  component: Outlet,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml -- The library safely serializes the inline theme configuration.
          dangerouslySetInnerHTML={{ __html: getThemeScript(themeOptions) }}
        />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider {...themeOptions}>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
```

Merge this example into your existing root route, keeping its metadata, styles, and error handling. `suppressHydrationWarning` handles the changes the initialization script makes to `<html>` attributes.

The script initializes page styles only; text using `useTheme` updates after mounting. Apps with a CSP must allow the inline script through a nonce or hash. See the complete [TanStack Start example](./apps/tanstack-start).

## Development

Use Node.js `22.23.2` and pnpm `10.24.0` for this repository:

```sh
pnpm install
pnpm dev              # Development build
pnpm build            # Production build, declarations, and package checks
pnpm check            # Lint, formatting, types, and unit tests
pnpm test:react18     # Packed React 18 compatibility check
pnpm test:vite-compat # Packed check with the installed Vite version
pnpm test:e2e         # Build both apps and run browser tests
pnpm pack:check       # Preview npm package files
```

Dependency versions live in `pnpm-workspace.yaml`, with one root lockfile. Root tests and Start use React 19; the SPA uses React 18.2. Compatibility checks reuse installed dependencies and do not install them automatically.

Run `pnpm build` before starting the examples, then use separate terminals:

```sh
pnpm --filter @react-theme/react-spa dev --port 5173
pnpm --filter @react-theme/tanstack-start dev --port 5174
```

Rebuild after library changes. Before Start's first type check, run its development server or build to generate the route tree.

E2E uses Chromium and requires ports `4173` and `4174` to be free. Install the browser with `pnpm exec playwright install chromium` when needed. Failure artifacts are saved in `test-results/`. `pnpm check` does not include E2E.

Before publishing, inspect dependency versions in the actual tarball. `pnpm pack` converts Catalog references into standard version ranges.

## License

[MIT](./LICENSE)
