# @ringotangs/react-theme

Lightweight theme management for React 18.2+ and React 19, with system preferences, persistence, and SSR support.

English | [简体中文](./README.zh-CN.md)

## Features

- `light`, `dark`, and `system` modes.
- System preference updates and cross-tab localStorage synchronization.
- Configurable default theme and storage key.
- Deterministic SSR and hydration, with an optional pre-paint initialization script.
- Safe fallbacks when storage or system preference APIs are unavailable.
- TypeScript declarations and ESM/CJS output. React remains a peer dependency.

## Installation

Requires React `^18.2.0 || ^19.0.0`. The root tests and TanStack Start use React 19; the Workspace SPA and packed consumer check use React 18.2.0. Install in your React application:

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

## API

### ThemeProvider

Accepts `children` and these optional properties:

| Property        | Type                            | Default    |
| --------------- | ------------------------------- | ---------- |
| `defaultTheme`  | `'light' \| 'dark' \| 'system'` | `'system'` |
| `storageKey`    | `string`                        | `'theme'`  |
| `darkClassName` | `string`                        | `'dark'`   |

A valid saved mode takes priority over `defaultTheme`, including a saved `system` value. Missing, invalid, or inaccessible storage falls back to `defaultTheme`. If the selected mode is `system`, the OS preference determines the resolved theme; unavailable or failing detection falls back to `light`.

Calling `setTheme` updates the theme and attempts to save it. Initialization, system preference changes, and cross-tab synchronization do not write to storage. Storage failures do not prevent in-memory switching. Changes to the configured key or default reload the preference for that configuration. Cross-tab removal, clearing, or an invalid value falls back to `defaultTheme`.

Set `darkClassName` to a single non-empty class token to customize root styling.
Changing it removes the previously managed class and applies the new one using
the current resolved theme, without resetting or writing preferences. Other
classes and styles are preserved; unmounting retains the existing root styling.
An empty string, any whitespace (including Unicode whitespace), or a non-string
value throws `TypeError: darkClassName must be a non-empty string without whitespace`
during provider rendering or script generation. Values are not trimmed. Omitted
or `undefined` values use `'dark'`. Choose a CSS-friendly name such as `theme-dark`.

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

Returns standalone JavaScript without `<script>` tags. All options are optional and use the same defaults as `ThemeProvider`. Generation is safe on the server. The generated script reads browser preferences and applies the root class and color scheme without writing storage or registering listeners. Configuration is safely serialized for inline script placement.

**Use the same `defaultTheme`, `storageKey`, and `darkClassName` for the script and provider (or Vite plugin).** Share a configuration module when customizing them:

```ts
// src/theme-options.ts
import type { ThemeScriptOptions } from '@ringotangs/react-theme'

export const themeOptions = {
  defaultTheme: 'system',
  storageKey: 'app-theme',
  darkClassName: 'theme-dark',
} satisfies ThemeScriptOptions
```

The shared custom configuration above needs corresponding application CSS:

```css
:root.theme-dark {
  background: #171717;
  color: white;
}
```

The provider and initialization script manage only the configured class. With a
custom name, an existing `dark` class is treated as unrelated and preserved.

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

For the correct theme before the first paint, use the Vite plugin with the same
configuration as the provider:

```ts
// vite.config.ts
import { reactTheme } from '@ringotangs/react-theme/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { themeOptions } from './src/theme-options.ts'

export default defineConfig({
  plugins: [react(), reactTheme(themeOptions)],
})
```

`reactTheme(options?: ThemeScriptOptions)` returns a Vite plugin. Options default
to `defaultTheme: 'system'`, `storageKey: 'theme'`, and `darkClassName: 'dark'`, just like `getThemeScript()`
and `ThemeProvider`. The subpath also exports the `ThemeScriptOptions` type.
Vite is provided by your application; the plugin has no runtime Vite or React
imports, and the core entry does not import the plugin. The declared Vite peer
range is `^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`; the development environment
remains on Vite 8.

`pnpm test:vite-compat` builds and tests the real npm tarball with the locally
installed Vite, without installing dependencies. CI tests both the minimum
release and the latest patch release of each major (5–8), including ESM imports,
TypeScript declarations, development HTML transforms, production builds, and
synchronous, duplicate-free script injection. Consult the matrix results for
verified versions; the peer range alone is not evidence that every version has
passed. Local tarball checks passed with Vite 8.0.10 and 8.3.4 using TypeScript
5.9.3 (`skipLibCheck: false`); other versions require the CI matrix to run.

The plugin injects a synchronous classic script at `head-prepend` in development
and production, without `src`, `async`, `defer`, or `type="module"`. It reserves
`id="react-theme-script"`; an existing marked script is left unchanged. Duplicate
registrations and repeated HTML transformations keep the first injected
configuration. Share one configuration with the provider.

You can also inject `getThemeScript()` manually instead of using the plugin:

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

Both approaches use Vite's [HTML transformation hook](https://vite.dev/guide/api-plugin#transformindexhtml) in development and production builds. Choose one approach; do not combine the plugin with an unmarked manual script.

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

### Dependency versions and packaging

Version declarations live in `pnpm-workspace.yaml`: the default `catalog` covers
third-party dependencies and React 19; the named `react18` catalog pins React 18
and its matching types for the SPA. Each package keeps its own declarations using
`catalog:` or `catalog:react18`; internal dependencies keep
`workspace:*`. The library's React peer range is `^18.2.0 || ^19.0.0`, independently of
the development React version. Preserve version ranges when moving entries.
After changing declarations, update the lockfile manually from the repository
root with `pnpm install --lockfile-only` and review it for unintended upgrades.

pnpm expands `catalog:` when packing or publishing, as described in its
[Catalog documentation](https://pnpm.io/catalogs#publishing). The current
`pack:check` script uses `npm pack --dry-run`, and the unchanged release workflow
uses `npm publish`; do not assume they perform pnpm's protocol conversion. A
successful file-list preview does not verify the packed manifest. Inspect the
actual tarball's `package.json` before releasing. In the verified local tarballs,
`npm pack` retained all 23 development dependency `catalog:` references, while
`pnpm pack` expanded them to their original version ranges. Both retained the
React peer range and the core/Vite entry points. Catalog references currently
appear only in this library's development dependencies, which registry consumers
normally do not install; this differs from unresolved runtime or peer dependency
protocols. If those fields later use Catalog, ensure the release artifact contains
standard dependency ranges. `private: true` remains until release preparation.

### React 18 and React 19 verification

All projects use the root pnpm Workspace and its single `pnpm-lock.yaml`:

- Root Vitest and `apps/tanstack-start` use the default Catalog's React 19.
- `apps/react-spa` uses `catalog:react18`: React/ReactDOM `18.2.0`,
  `@types/react@18.2.79`, and `@types/react-dom@18.2.25`.
- A scoped override keeps React DOM 18's wildcard React types dependency on the
  React 18 catalog without changing React 19 consumers.

Install dependencies manually from the repository root with `pnpm install` after
changing declarations. There is no separate compatibility project or install.
After installation, run from the repository root:

```sh
pnpm check
pnpm test:react18
pnpm test:e2e
pnpm --filter @react-theme/react-spa typecheck
pnpm --filter @react-theme/tanstack-start typecheck
pnpm pack:check
```

`test:react18` builds the library and runs `tests/compat/react18/verify.mjs`.
It reuses the SPA's installed React 18 runtime and types, checks their real module
paths and shared renderer instance, and checks that root/Start still resolve
React 19. It also loads the SPA's actual Vite configuration and verifies that
React, JSX runtime, and ReactDOM imports from both the app and linked library
resolve to the SPA copy. The app uses `resolve.dedupe` for React and ReactDOM.
Its TypeScript paths also select the SPA's React 18 types for linked library
declarations, which would otherwise resolve the root React 19 types.

A real npm tarball is extracted into a temporary consumer for ESM/CJS, theme
switching, storage restoration, System updates, storage-event synchronization,
SSR, hydration without preference overwrites, and JSX/CJS declaration compilation
with `skipLibCheck: false`. No dependencies are installed by the test command.
Existing TypeScript and jsdom are reused as tools. These standalone type samples
are compiled by the consumer runner, not against the root React 19 types.

Playwright runs the production React 18 SPA and React 19 Start. A test-only
DevTools hook records the actual browser renderer version, and the tests require
one expected renderer plus working theme interactions without React errors.
The original theme scenarios remain enabled for both apps. CI runs the packed
consumer check after the library build, then E2E and both app type checks.
The migrated checks have passed with React 18.2.0 in the SPA and React 19.3.1 in
Start/root. Other React 18 patch/minor releases are not separately tested.

## Integration apps

`apps/react-spa` is a Vite React SPA; `apps/tanstack-start` uses real SSR with
TanStack Start and Nitro. Both private workspace apps import the library through
its public package entry and built `dist` files. Their theme script and provider
share `defaultTheme: 'system'` and `storageKey: 'theme'` within each app. The SPA
uses `darkClassName: 'theme-dark'` with matching CSS; Start omits the option and
continues to use the default `dark` class.

Run these commands from the repository root, with dependencies already installed:

```sh
# Build the library before starting or building either app.
pnpm build
pnpm --filter @react-theme/react-spa build
pnpm --filter @react-theme/tanstack-start build
pnpm --filter @react-theme/react-spa typecheck
pnpm --filter @react-theme/tanstack-start typecheck
pnpm check
```

Start development servers in separate terminals:

```sh
pnpm --filter @react-theme/react-spa dev --port 5173
pnpm --filter @react-theme/tanstack-start dev --port 5174
```

After building, run the production apps in separate terminals:

```sh
pnpm --filter @react-theme/react-spa preview --port 4173
PORT=4174 pnpm --filter @react-theme/tanstack-start start
```

Choose Light, Dark, and System, then refresh to check persistence. In System mode,
change the browser/OS color preference and check the resolved theme and page
colors. Start's HTTP response contains the rendered page and the inline theme
script in its document head. The SPA injects that script through Vite's HTML hook
in both development and production. SSR theme text starts with the provider's
default and updates after hydration; the head script applies root styling first.
Start generates its ignored route tree during development/build, so run one of
those before its first type check. Rebuild the root library after library changes;
the apps do not import library source files.

### Playwright integration tests

With dependencies and Chromium already installed, run from the repository root:

```sh
pnpm test:e2e
```

This builds the root library, the SPA, and Start in order, then Playwright starts
the production SPA preview on `127.0.0.1:4173` and Nitro SSR on `127.0.0.1:4174`.
Both ports must be free; existing servers are not reused. Start automatically
generates its ignored route tree during the build, including in a fresh checkout.

The Chromium projects cover theme selection, root styles, reload persistence,
system preference changes, cross-tab synchronization, and head initialization
with client scripts blocked. Start also checks raw SSR HTML and hydration without
errors or overwriting saved preferences. Tests use isolated browser contexts and
explicit saved preferences, without fixed delays. Vitest remains separate:
`pnpm test` runs unit tests; `pnpm check` does not run E2E tests.

Failures retain traces and screenshots under ignored `test-results/`. After a
build, `pnpm exec playwright test --project=tanstack-start-chromium` runs only the
Start project; `pnpm exec playwright test --list` lists cases without starting
servers. Browser installation is a separate manual step when needed:
`pnpm exec playwright install chromium` (repository root).

## License

[MIT](./LICENSE)
