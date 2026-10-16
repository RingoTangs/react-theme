# @ringotangs/react-theme

支持 React 18.2 和 React 19 的轻量级主题管理库。

[English](./README.md) | 简体中文

- 浅色、深色和跟随系统三种模式。
- 自动保存偏好，响应系统变化，支持跨标签页同步。
- 支持 SSR，提供首屏主题初始化脚本。
- 内置 TypeScript 类型，提供 ESM 和 CJS 产物。

## 安装

需要 React `^18.2.0 || ^19.0.0`：

```sh
pnpm add @ringotangs/react-theme
```

## 快速开始

用 `ThemeProvider` 包裹应用，在其内部调用 `useTheme`：

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

Provider 默认切换 `document.documentElement` 的 `dark` class，并将其 `style.colorScheme` 设为 `light` 或 `dark`，保留其他 class 和样式。应用需要自行提供配色，例如：

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

## 配置与 API

### ThemeProvider

| 属性            | 类型                            | 默认值     |
| --------------- | ------------------------------- | ---------- |
| `defaultTheme`  | `'light' \| 'dark' \| 'system'` | `'system'` |
| `storageKey`    | `string`                        | `'theme'`  |
| `darkClassName` | `string`                        | `'dark'`   |

已保存的有效主题优先于 `defaultTheme`；没有有效存储时使用默认值。系统主题检测不可用时使用浅色。存储失败不会阻止当前页面切换主题。

`darkClassName` 必须是非空且不含空白的单个类名，例如 `theme-dark`；无效值会抛出 `TypeError`。使用自定义类名时，请同步修改 CSS 选择器。

### useTheme

| 返回值           | 含义                                        |
| ---------------- | ------------------------------------------- |
| `theme`          | 用户选择的模式：`light`、`dark` 或 `system` |
| `resolvedTheme`  | 实际主题：`light` 或 `dark`                 |
| `setTheme(mode)` | 切换并保存模式，不接受函数式更新器          |

例如，跟随深色系统时，`theme` 为 `system`，`resolvedTheme` 为 `dark`。在 `ThemeProvider` 外调用 Hook 会抛出错误。

### getThemeScript

`getThemeScript(options?)` 返回不含 `<script>` 标签的 JavaScript 字符串，可在服务端生成。选项和默认值与 `ThemeProvider` 相同。

脚本在首次绘制前应用根元素类名和配色方案，不写入存储。Vite 应用推荐通过下方插件自动注入；SSR 应用将它放入文档 `<head>`。

### 其他导出

- 类型：`ThemeMode`、`ResolvedTheme`、`ThemeProviderProps`、`ThemeContextValue`、`ThemeScriptOptions`。
- 常量：`themeModes`、`THEME_STORAGE_KEY`（`theme`）、`SYSTEM_THEME_QUERY`。
- 工具：`isThemeMode(value)`、`getSystemTheme()`、`readStoredTheme(storageKey?, fallback?)`、`persistTheme(theme, storageKey?)`。

`readStoredTheme` 默认使用存储键 `theme`，回退值为 `system`。工具函数不修改页面样式。

## Vite

支持 Vite `^5.1.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`。使用 `reactTheme` 插件在首次绘制前应用主题，减少刷新时的明暗闪烁。

先创建共享配置，确保插件和 Provider 使用相同选项：

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

在应用入口包裹 Provider；此时 `App` 内不需要再包裹一层：

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

插件适用于开发和生产构建，无需再手动注入主题脚本。完整示例见 [Vite SPA](./apps/react-spa)。

## SSR

服务端和客户端首次渲染使用相同的 `defaultTheme`；选择 `system` 时，实际主题初始为 `light`。Provider 挂载后恢复已保存的偏好并检测系统主题。

为减少首屏闪烁，将 `getThemeScript()` 生成的脚本放在 `<head>` 前部，在首次绘制前同步执行。脚本与 Provider 必须使用相同配置；不要添加 `async`、`defer` 或 `type="module"`。

以下是 TanStack Start 根文档示例，复用上面的 `src/theme-options.ts`：

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
    <html lang="zh-CN" suppressHydrationWarning>
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

将示例合并到现有根路由，保留应用原有的元数据、样式和错误处理。`suppressHydrationWarning` 用于处理首屏脚本对 `<html>` 属性的修改。

脚本只提前更新页面样式，依赖 `useTheme` 的文本仍会在挂载后更新。启用 CSP 的应用需要通过 nonce 或 hash 允许内联脚本。完整示例见 [TanStack Start](./apps/tanstack-start)。

## 开发

本仓库使用 Node.js `22.23.2` 和 pnpm `10.24.0`：

```sh
pnpm install
pnpm dev              # 开发构建
pnpm build            # 生产构建，含类型声明和包检查
pnpm check            # Lint、格式、类型检查和单元测试
pnpm test:react18     # React 18 打包兼容性检查
pnpm test:vite-compat # 本地 Vite 打包兼容性检查
pnpm test:e2e         # 构建两个应用并运行浏览器测试
pnpm pack:check       # 预览 npm 包文件列表
```

依赖版本统一放在 `pnpm-workspace.yaml`，所有项目共用根锁文件。根测试和 Start 使用 React 19，SPA 使用 React 18.2。兼容性测试复用已安装依赖，不会自动安装。

启动示例前先运行 `pnpm build`，再在不同终端执行：

```sh
pnpm --filter @react-theme/react-spa dev --port 5173
pnpm --filter @react-theme/tanstack-start dev --port 5174
```

修改库后需重新构建。Start 首次类型检查前需先运行开发服务器或构建，以生成路由树。

E2E 使用 Chromium，占用端口 `4173`、`4174`。首次使用时可运行 `pnpm exec playwright install chromium` 安装浏览器。失败记录保存在 `test-results/`；`pnpm check` 不包含 E2E。

发布前检查实际 tarball 中的依赖版本；使用 `pnpm pack` 会将 Catalog 引用转换为普通版本范围。

## 许可

[MIT](./LICENSE)
