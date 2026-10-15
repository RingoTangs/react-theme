# @ringotangs/react-theme

面向 React 19 的轻量级主题管理库，支持系统偏好、持久化和 SSR。

[English](./README.md) | 简体中文

## 功能特性

- 支持 `light`、`dark` 和 `system` 三种模式。
- 响应系统偏好变化，通过 localStorage 跨标签页同步。
- 可配置默认主题和存储键。
- 保持 SSR 与 Hydration 首次渲染一致，可选用首次绘制前的初始化脚本。
- 存储或系统偏好 API 不可用时安全回退。
- 提供 TypeScript 类型声明及 ESM/CJS 产物，React 作为 peer dependency。

## 安装

需要 React `^19.0.0`。在 React 19 应用中安装：

```sh
pnpm add @ringotangs/react-theme
```

当前仓库仍保留 `private: true`，发布前需移除。上述命令以包已在所用 registry 中可用为前提。正式发布前，可在本仓库运行 `pnpm build` 和 `pnpm pack`，再在应用中安装生成的 `.tgz`：

```sh
pnpm add /path/to/ringotangs-react-theme-0.1.0.tgz
```

## 快速开始

使用 `ThemeProvider` 包裹应用，在其内部调用 `useTheme`：

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

Provider 切换 `document.documentElement` 的 `dark` class，并将其 `style.colorScheme` 设为 `light` 或 `dark`，保留其他 class 和样式。应用需要自行提供配色，例如：

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

接受 `children` 和以下可选属性：

| 属性           | 类型                            | 默认值     |
| -------------- | ------------------------------- | ---------- |
| `defaultTheme` | `'light' \| 'dark' \| 'system'` | `'system'` |
| `storageKey`   | `string`                        | `'theme'`  |

合法的已保存模式优先于 `defaultTheme`，包括已保存的 `system`。存储缺失、无效或不可访问时使用 `defaultTheme`。选中 `system` 时由操作系统偏好决定实际主题；检测不可用或失败时回退为 `light`。

调用 `setTheme` 会更新主题并尝试保存。初始化、系统偏好变化和跨标签页同步不会写入存储。存储失败不影响当前页面切换主题。修改存储键或默认值会重新读取对应配置的偏好。其他标签页删除、清空存储或写入无效值时，回退到 `defaultTheme`。

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

- `theme: ThemeMode`：`light`、`dark` 或 `system`。
- `resolvedTheme: ResolvedTheme`：`light` 或 `dark`。
- `setTheme(theme: ThemeMode): void`：选择并持久化模式，不接受函数式更新器。

在 `ThemeProvider` 外调用会抛出 `useTheme must be used within a ThemeProvider`。

### getThemeScript

```ts
const script = getThemeScript({
  defaultTheme: 'system',
  storageKey: 'theme',
})
```

返回独立执行的 JavaScript，不包含 `<script>` 标签。两个选项均可省略，默认值与 `ThemeProvider` 相同。生成函数可安全地在服务端调用。生成的脚本读取浏览器偏好并应用根元素 class 和配色方案，不写入存储，也不注册监听器。配置经过适用于内联脚本的安全序列化。

**脚本与 Provider 必须使用相同的 `defaultTheme` 和 `storageKey`。** 自定义时可共享配置模块：

```ts
// src/theme-options.ts
import type { ThemeScriptOptions } from '@ringotangs/react-theme'

export const themeOptions = {
  defaultTheme: 'system',
  storageKey: 'app-theme',
} satisfies ThemeScriptOptions
```

公共类型包括 `ThemeMode`、`ResolvedTheme`、`ThemeProviderProps`、`ThemeContextValue` 和 `ThemeScriptOptions`。此外还导出 `themeModes`、`THEME_STORAGE_KEY`、`SYSTEM_THEME_QUERY`、`isThemeMode`、`getSystemTheme`、`readStoredTheme(storageKey?, fallback?)` 和 `persistTheme(theme, storageKey?)`。核心读取函数默认使用存储键 `theme` 和回退模式 `system`；核心工具函数不操作 DOM 样式。

## Vite SPA

在已有 Vite React 应用中使用上述共享配置。在 `src/main.tsx` 挂载 Provider（此处导入的 `App` 只包含应用 UI，不再包裹另一层 Provider）：

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

为在首次绘制前应用正确主题，可在 HTML 转换阶段向 `<head>` 开头注入同步内联脚本：

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

这里使用 Vite 的 [HTML 转换钩子](https://vite.dev/guide/api-plugin#transformindexhtml)，同时适用于开发和生产构建。请将其合并到已有配置中。

## TanStack Start SSR

在 TanStack Start 应用中使用上述共享的 `src/theme-options.ts`，并将脚本放入根文档，例如：

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

请将文档外壳合并到已有根路由，保留原有元数据、样式、路由上下文和错误处理。脚本位于托管的 head 内容及 Hydration 脚本之前。参见 TanStack 的[文档 head 管理](https://tanstack.com/router/latest/docs/guide/document-head-management)。

## SSR、Hydration 与首次绘制

服务端和客户端首次渲染均使用 `defaultTheme`。默认模式为 `system` 时，`resolvedTheme` 初始为 `light`；显式默认主题则解析为自身。Provider 挂载后才读取 localStorage、检测系统主题，再更新 Context 和 DOM。恢复过程中不会覆盖已保存的偏好。

初始化脚本可以在 React 启动前应用实际浏览器主题。它修改 DOM，不改变 React 首次渲染的 Context 值。**要避免错误主题闪烁，脚本必须在首次绘制前执行；仅早于 Hydration 仍然不够。** 应将它作为同步的普通脚本放在 `<head>` 前部，不使用 `defer`、`async` 或模块脚本。在 React effect 中调用无法达到这一目的。

SSR 文档在 `<html>` 上使用 `suppressHydrationWarning`，用于处理脚本提前修改的根元素属性，不会修复其他标记不一致。服务端与客户端必须使用相同的 Provider 配置。依赖主题的文本在恢复前仍显示默认状态；首屏脚本只初始化根元素样式。不使用脚本时 Provider 仍可工作，但可能出现错误主题闪烁。如果应用启用了内容安全策略（CSP），需通过应用的 nonce 或 hash 策略允许该内联脚本。

## 开发

本仓库使用 Node.js `22.23.2` 和 pnpm `10.24.0`。

```sh
pnpm install
pnpm dev         # 开发构建及类型声明
pnpm test        # 单次运行 Vitest
pnpm check       # Lint、格式、类型检查和测试
pnpm build       # 生产 ESM/CJS 构建及类型声明
pnpm pack:check  # 预览 npm 包内容
```

## 集成测试应用

`apps/react-spa` 是 Vite React SPA；`apps/tanstack-start` 使用 TanStack Start 和
Nitro 提供真实 SSR。两个应用均为私有 Workspace 包，通过正式包入口引用库的
`dist` 产物。每个应用的首屏脚本与 Provider 共用配置：
`defaultTheme: 'system'`、`storageKey: 'theme'`。

依赖已安装后，在仓库根目录依次执行：

```sh
# 启动或构建应用前，先构建库。
pnpm build
pnpm --filter @react-theme/react-spa build
pnpm --filter @react-theme/tanstack-start build
pnpm --filter @react-theme/react-spa typecheck
pnpm --filter @react-theme/tanstack-start typecheck
pnpm check
```

在不同终端启动开发服务器：

```sh
pnpm --filter @react-theme/react-spa dev --port 5173
pnpm --filter @react-theme/tanstack-start dev --port 5174
```

构建后，在不同终端启动生产应用：

```sh
pnpm --filter @react-theme/react-spa preview --port 4173
PORT=4174 pnpm --filter @react-theme/tanstack-start start
```

分别选择 Light、Dark、System 并刷新，检查偏好恢复；在 System 模式下改变浏览器或
系统明暗偏好，检查实际主题与页面颜色。Start 的原始 HTTP 响应包含已渲染的页面及
head 内联主题脚本；SPA 在开发和生产模式下均通过 Vite HTML hook 注入脚本。
SSR 主题文本初始使用 Provider 默认值，Hydration 后恢复；head 脚本提前应用根元素样式。
Start 在开发或构建时生成被忽略的路由树，因此首次类型检查前需先运行开发或构建。
修改库后需重新构建根目录的库，应用不会直接读取库源码。

### Playwright 集成测试

依赖和 Chromium 已安装后，在仓库根目录执行：

```sh
pnpm test:e2e
```

该命令依次构建根目录库、SPA、Start，再由 Playwright 启动生产 SPA preview
（`127.0.0.1:4173`）和 Nitro SSR（`127.0.0.1:4174`）。两个端口必须空闲，
不会复用已有服务。Start 在构建时自动生成被忽略的路由树，干净检出也无需预先生成。

两个 Chromium project 覆盖主题切换、根元素样式、刷新恢复、系统偏好变化、跨标签页同步，
以及阻止客户端脚本加载后的 head 初始化。Start 额外检查原始 SSR HTML，以及无错误、
不覆盖已有偏好的 Hydration。测试使用隔离的浏览器上下文及明确的已保存偏好，
不使用固定延迟。Vitest 保持独立：`pnpm test` 运行单元测试，`pnpm check` 不运行 E2E。

失败时在被忽略的 `test-results/` 中保留 trace 和截图。构建后可用
`pnpm exec playwright test --project=tanstack-start-chromium` 单独运行 Start，
或用 `pnpm exec playwright test --list` 列出用例而不启动服务。
需要浏览器时，在仓库根目录手动执行 `pnpm exec playwright install chromium`；
测试命令不会自动安装。

## 许可

[MIT](./LICENSE)
