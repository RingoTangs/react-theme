# @ringotangs/react-theme

支持 React 18.2+ 和 React 19 的轻量级主题管理库，支持系统偏好、持久化和 SSR。

[English](./README.md) | 简体中文

## 功能特性

- 支持 `light`、`dark` 和 `system` 三种模式。
- 响应系统偏好变化，通过 localStorage 跨标签页同步。
- 可配置默认主题和存储键。
- 保持 SSR 与 Hydration 首次渲染一致，可选用首次绘制前的初始化脚本。
- 存储或系统偏好 API 不可用时安全回退。
- 提供 TypeScript 类型声明及 ESM/CJS 产物，React 作为 peer dependency。

## 安装

需要 React `^18.2.0 || ^19.0.0`。根目录测试和 TanStack Start 使用 React 19，Workspace SPA 和真实打包消费者检查使用 React 18.2.0。在 React 应用中安装：

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

## API

### ThemeProvider

接受 `children` 和以下可选属性：

| 属性            | 类型                            | 默认值     |
| --------------- | ------------------------------- | ---------- |
| `defaultTheme`  | `'light' \| 'dark' \| 'system'` | `'system'` |
| `storageKey`    | `string`                        | `'theme'`  |
| `darkClassName` | `string`                        | `'dark'`   |

合法的已保存模式优先于 `defaultTheme`，包括已保存的 `system`。存储缺失、无效或不可访问时使用 `defaultTheme`。选中 `system` 时由操作系统偏好决定实际主题；检测不可用或失败时回退为 `light`。

调用 `setTheme` 会更新主题并尝试保存。初始化、系统偏好变化和跨标签页同步不会写入存储。存储失败不影响当前页面切换主题。修改存储键或默认值会重新读取对应配置的偏好。其他标签页删除、清空存储或写入无效值时，回退到 `defaultTheme`。

`darkClassName` 可配置为单个非空 class token。动态修改时，Provider 清理此前管理的
类名，并根据当前实际主题应用新类名，不重置或写入偏好。其他 class 和样式保持不变；
卸载时沿用原有行为，保留根元素样式。
空字符串、包含任何空白（包括 Unicode 空白）或运行时非字符串值，均会在 Provider
渲染或脚本生成时抛出明确错误：
`TypeError: darkClassName must be a non-empty string without whitespace`。
不会自动修剪；省略或传入 `undefined` 时使用 `'dark'`。建议使用便于编写 CSS 的名称，
例如 `theme-dark`。

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

返回独立执行的 JavaScript，不包含 `<script>` 标签。所有选项均可省略，默认值与 `ThemeProvider` 相同。生成函数可安全地在服务端调用。生成的脚本读取浏览器偏好并应用根元素 class 和配色方案，不写入存储，也不注册监听器。配置经过适用于内联脚本的安全序列化。

**脚本（或 Vite 插件）与 Provider 必须使用相同的 `defaultTheme`、`storageKey` 和 `darkClassName`。** 自定义时可共享配置模块：

```ts
// src/theme-options.ts
import type { ThemeScriptOptions } from '@ringotangs/react-theme'

export const themeOptions = {
  defaultTheme: 'system',
  storageKey: 'app-theme',
  darkClassName: 'theme-dark',
} satisfies ThemeScriptOptions
```

上述自定义共享配置需要配套应用 CSS：

```css
:root.theme-dark {
  background: #171717;
  color: white;
}
```

Provider 与首屏脚本只管理配置的类名。使用自定义名称后，已有的 `dark` class
视为无关类名并保留。

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

为在首次绘制前应用正确主题，推荐使用 Vite 插件，并传入与 Provider 相同的共享配置：

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

`reactTheme(options?: ThemeScriptOptions)` 返回 Vite 插件，选项默认值与
`getThemeScript()`、`ThemeProvider` 相同：`defaultTheme: 'system'`、
`storageKey: 'theme'`、`darkClassName: 'dark'`。该子路径也导出 `ThemeScriptOptions` 类型。
Vite 由应用提供；插件不在运行时导入 Vite 或 React，核心入口也不导入插件。
Vite peer 声明范围为 `^5.1.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`，开发环境仍使用 Vite 8。
Vite 5 最低要求为 5.1.0，该版本修复了上游 `FSWatcher` 声明缺少 `ref`、`unref`
而无法通过当前 Node.js 类型严格声明检查的问题。

`pnpm test:vite-compat` 构建并使用本地已安装的 Vite 验证真实 npm tarball，
不会安装依赖。CI 对 Vite 5–8 的各主版本最低支持版本和最新补丁版本分别验证，覆盖
ESM 导入、TypeScript 声明、开发环境 HTML 转换、生产构建，以及同步且不重复的脚本注入。
实际通过的版本以矩阵结果为准，peer 声明范围不代表所有版本均已验证。
本地 tarball 检查已通过 Vite 8.0.10、8.3.4，类型验证使用 TypeScript 5.9.3
（`skipLibCheck: false`）；其他版本需要等待 CI 矩阵执行。

插件在开发和生产模式下均通过 `head-prepend` 注入同步普通脚本，不带 `src`、
`async`、`defer` 或 `type="module"`。插件保留 `id="react-theme-script"`；
如果 HTML 已包含带此标记的脚本，则保持原样。重复注册插件或重复转换 HTML 时，
保留首个注入脚本的配置。请只使用一份与 Provider 共享的配置。

也可继续手动调用 `getThemeScript()` 注入脚本，代替插件：

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

两种方式均使用 Vite 的 [HTML 转换钩子](https://vite.dev/guide/api-plugin#transformindexhtml)，同时适用于开发和生产构建。请选择其中一种，不要将插件与未带标记的手动脚本同时使用。

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

### 依赖版本与打包

`pnpm-workspace.yaml` 是依赖版本配置入口：默认 `catalog` 管理第三方依赖和 React 19，
命名 Catalog `react18` 为 SPA 固定 React 18 及匹配类型。各项目保留自己的依赖声明，
使用 `catalog:` 或 `catalog:react18`；内部依赖保留 `workspace:*`。库的 React peer 范围保持
`^18.2.0 || ^19.0.0`，与开发环境的 React 版本独立。迁移条目时保留原有版本范围。
修改声明后，在仓库根目录手动执行 `pnpm install --lockfile-only`，
并检查锁文件是否出现非预期升级。

根据 pnpm 的 [Catalog 发布说明](https://pnpm.io/catalogs#publishing)，
pnpm 会在打包或发布时展开 `catalog:`。当前 `pack:check` 使用
`npm pack --dry-run`，现有发布工作流使用 `npm publish`，不能假设它们执行了
pnpm 的协议转换。文件列表预览成功不代表打包 manifest 已正确转换，发布前需检查实际
tarball 内的 `package.json`。本地实际打包验证中，`npm pack` 保留了全部 23 项
开发依赖的 `catalog:`，`pnpm pack` 则全部展开为原版本范围；两者均保留了
React peer 范围及核心、Vite 子入口。当前库的 Catalog 引用只位于开发依赖，registry
消费者通常不会安装这些依赖；这与运行时依赖或 peer 依赖含未展开协议的风险不同。
若未来这些字段使用 Catalog，须保证发布产物中已转换为标准版本范围。
本仓库继续保留 `private: true`，直到单独准备发布。

### React 18 与 React 19 验证

所有项目共用根 pnpm Workspace 和唯一的 `pnpm-lock.yaml`：

- 根目录 Vitest 和 `apps/tanstack-start` 使用默认 Catalog 的 React 19。
- `apps/react-spa` 使用 `catalog:react18`：React/ReactDOM `18.2.0`、
  `@types/react@18.2.79`、`@types/react-dom@18.2.25`。
- 限定范围的 override 将 React DOM 18 的通配符 React 类型依赖保持在 React 18
  Catalog，不影响 React 19 消费者。

修改声明后在仓库根目录手动执行 `pnpm install`，不再有独立兼容性项目或安装步骤。
安装后，在仓库根目录执行：

```sh
pnpm check
pnpm test:react18
pnpm test:e2e
pnpm --filter @react-theme/react-spa typecheck
pnpm --filter @react-theme/tanstack-start typecheck
pnpm pack:check
```

`test:react18` 构建库后运行 `tests/compat/react18/verify.mjs`，复用 SPA 已安装的
React 18 运行时和类型，检查真实解析路径及渲染器的 React 实例一致性，并确认根目录和
Start 仍解析 React 19。脚本读取 SPA 的真实 Vite 配置，验证应用、链接库及渲染器导入的
React、JSX runtime 和 ReactDOM 均解析到 SPA 的同一副本。应用通过
`resolve.dedupe` 对 React 和 ReactDOM 去重。
SPA 的 TypeScript paths 同时将链接库声明中的 React 类型解析固定为应用的 React 18
类型，避免默认解析到根目录的 React 19 类型。

实际 npm tarball 会解包至临时消费者，验证 ESM/CJS、主题切换、存储恢复、System
变化、storage 事件同步、SSR、不覆盖偏好的 Hydration，以及
`skipLibCheck: false` 下的 JSX/CJS 类型声明。测试命令不安装依赖，仅复用现有
TypeScript 和 jsdom 工具；类型样例由消费者脚本编译，不使用根目录的 React 19 类型。

Playwright 运行生产 React 18 SPA 和 React 19 Start；仅测试使用的 DevTools hook
记录浏览器实际渲染器版本，断言只有一个符合预期的渲染器，且主题交互无 React 错误。
两个应用保留原有全部主题测试场景。CI 在库构建后运行打包消费者检查，再执行 E2E
和两个应用的类型检查。迁移后的检查已在 SPA 的 React 18.2.0 和根目录、Start 的
React 19.3.1 下通过；尚未分别测试其他 React 18 patch/minor 版本。

## 集成测试应用

`apps/react-spa` 是 Vite React SPA；`apps/tanstack-start` 使用 TanStack Start 和
Nitro 提供真实 SSR。两个应用均为私有 Workspace 包，通过正式包入口引用库的
`dist` 产物。每个应用的首屏脚本与 Provider 共用配置：
`defaultTheme: 'system'`、`storageKey: 'theme'`。SPA 显式使用
`darkClassName: 'theme-dark'` 及对应 CSS；Start 省略该选项，继续使用默认 `dark` 类名。

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
