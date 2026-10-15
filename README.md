# @ringotangs/react-theme

Lightweight theme management for React 19, with system preferences, persistence, and SSR support.

English | [简体中文](./README.zh-CN.md)

## Features

- `light`, `dark`, and `system` modes.
- System preference updates and cross-tab localStorage synchronization.
- Configurable default theme and storage key.
- Deterministic SSR and hydration, with an optional pre-paint initialization script.
- Safe fallbacks when storage or system preference APIs are unavailable.
- TypeScript declarations and ESM/CJS output. React remains a peer dependency.

## Installation

Requires React `^19.0.0`. For a React 19 application, install:

```sh
pnpm add @ringotangs/react-theme
```

This repository currently retains `private: true`; remove it before publishing. The command above assumes the package is available in your registry. To use a local build before publication, run `pnpm build` and `pnpm pack` in this repository, then install the resulting `.tgz` in your application:

```sh
pnpm add /path/to/ringotangs-react-theme-0.1.0.tgz
```

## Quick start

Wrap your application in `ThemeProvider` and use `useTheme` inside it:

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

The provider toggles the `dark` class on `document.documentElement` and sets its `style.colorScheme` to `light` or `dark`. It preserves other classes and styles. Supply your own application colors, for example:

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

## API

### ThemeProvider

Accepts `children` and these optional properties:

| Property       | Type                            | Default    |
| -------------- | ------------------------------- | ---------- |
| `defaultTheme` | `'light' \| 'dark' \| 'system'` | `'system'` |
| `storageKey`   | `string`                        | `'theme'`  |

A valid saved mode takes priority over `defaultTheme`, including a saved `system` value. Missing, invalid, or inaccessible storage falls back to `defaultTheme`. If the selected mode is `system`, the OS preference determines the resolved theme; unavailable or failing detection falls back to `light`.

Calling `setTheme` updates the theme and attempts to save it. Initialization, system preference changes, and cross-tab synchronization do not write to storage. Storage failures do not prevent in-memory switching. Changes to the configured key or default reload the preference for that configuration. Cross-tab removal, clearing, or an invalid value falls back to `defaultTheme`.

### useTheme

```tsx
export default function ThemeStatus() {
  const { theme, resolvedTheme } = useTheme()
  return (
    <span>
      {theme} / {resolvedTheme}
    </span>
  )
}
```

- `theme: ThemeMode`: `light`, `dark`, or `system`.
- `resolvedTheme: ResolvedTheme`: `light` or `dark`.
- `setTheme(theme: ThemeMode): void`: selects and persists a mode; it does not accept a functional updater.

Calling the hook outside `ThemeProvider` throws `useTheme must be used within a ThemeProvider`.

### getThemeScript

```ts
const script = getThemeScript({
  defaultTheme: 'system',
  storageKey: 'theme',
})
```

Returns standalone JavaScript without `<script>` tags. Both options are optional and use the same defaults as `ThemeProvider`. Generation is safe on the server. The generated script reads browser preferences and applies the root class and color scheme without writing storage or registering listeners. Configuration is safely serialized for inline script placement.

**Use the same `defaultTheme` and `storageKey` for the script and provider.** Share a configuration module when customizing them:

```ts
// src/theme-options.ts
import type { ThemeScriptOptions } from '@ringotangs/react-theme'

export const themeOptions = {
  defaultTheme: 'system',
  storageKey: 'app-theme',
} satisfies ThemeScriptOptions
```

Public types include `ThemeMode`, `ResolvedTheme`, `ThemeProviderProps`, `ThemeContextValue`, and `ThemeScriptOptions`. The package also exports `themeModes`, `THEME_STORAGE_KEY`, `SYSTEM_THEME_QUERY`, `isThemeMode`, `getSystemTheme`, `readStoredTheme(storageKey?, fallback?)`, and `persistTheme(theme, storageKey?)`. The core storage reader defaults to the key `theme` and fallback `system`; core helpers do not apply DOM styles.

## Vite SPA

In an existing Vite React app, use the shared configuration above. Mount the provider in `src/main.tsx` (the `App` imported here should contain your UI without another provider):

```tsx
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

For the correct theme before the first paint, inject a synchronous inline script into the beginning of `<head>` during HTML transformation:

```ts
import { getThemeScript } from '@ringotangs/react-theme'
import react from '@vitejs/plugin-react'
// vite.config.ts
import { defineConfig } from 'vite'
import { themeOptions } from './src/theme-options'

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
```

This uses Vite's [HTML transformation hook](https://vite.dev/guide/api-plugin#transformindexhtml) in development and production builds. Merge it into your existing configuration.

## TanStack Start SSR

In a TanStack Start app, use the shared `src/theme-options.ts` above and place the script in your root document. For example:

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

/* eslint-disable react-refresh/only-export-components -- TanStack root modules export route configuration alongside the document shell. */
/* eslint-disable react-dom/no-dangerously-set-innerhtml -- getThemeScript safely serializes inline script configuration. */
function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
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
/* eslint-enable react-dom/no-dangerously-set-innerhtml */
/* eslint-enable react-refresh/only-export-components */
```

Merge the shell into your existing root route, retaining its metadata, styles, route context, and error handling. The script precedes managed head content and hydration scripts. See TanStack's [document head management](https://tanstack.com/router/latest/docs/guide/document-head-management).

## SSR, hydration, and the first paint

The server and the first client render use `defaultTheme`. With `system`, `resolvedTheme` initially equals `light`; explicit defaults resolve to themselves. The provider reads localStorage and detects the OS theme after mounting, then updates context and the DOM. It does not overwrite saved preferences during restoration.

The initialization script can apply the actual browser theme before React starts. It changes the DOM, not the first React context value. **To avoid a flash of the wrong theme, it must run before the first paint; running only before hydration is insufficient.** Place it early in `<head>` as a synchronous classic script. Do not defer it, mark it `async`, or turn it into a module script. Calling it from a React effect is too late for this purpose.

In an SSR document, `suppressHydrationWarning` on `<html>` accounts for the root attributes changed by the script. It does not fix unrelated markup mismatches. Keep the same provider configuration on the server and client. Theme-dependent text initially follows the default until restoration; the script only initializes root styling. Without the script, the provider still works, but a wrong-theme flash can occur. If your app uses a Content Security Policy, allow the inline script through your application's nonce or hash policy.

## Development

Use Node.js `22.23.2` and pnpm `10.24.0` for this repository.

```sh
pnpm install
pnpm dev         # Development bundles and declarations
pnpm test        # Run Vitest once
pnpm check       # Lint, formatting, types, and tests
pnpm build       # Production ESM/CJS bundles and declarations
pnpm pack:check  # Preview npm package contents
```

## License

[MIT](./LICENSE)
