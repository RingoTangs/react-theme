# v0.1.1

2026-10-16

## English

The first tagged GitHub release of `@ringotangs/react-theme`, a lightweight theme management library for React.

### Features

- **Theme modes:** Choose light, dark, or system. System mode follows changes to the operating system's color preference.
- **Saved preferences:** Restore the selected mode from localStorage and synchronize changes across tabs. Theme switching still works when storage is unavailable.
- **React API:** Wrap your app in `ThemeProvider` and use `useTheme` to read the selected mode, read the resolved light or dark theme, and switch modes.
- **Configuration:** Customize the default theme, storage key, and dark class name. The provider manages the root element's theme class and color scheme; your application supplies the colors through CSS.
- **SSR support:** Keep the server and first client render consistent. Use `getThemeScript` to apply root styling before the first paint and reduce theme flashes. The script and provider must share the same configuration.
- **Vite integration:** Use `reactTheme` from `@ringotangs/react-theme/vite` to inject the initialization script in development and production.
- **Package formats:** TypeScript declarations and ESM/CJS builds.

### Compatibility

- React: `^18.2.0 || ^19.0.0`.
- Vite plugin: `^5.1.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`.

### Installation

```sh
pnpm add @ringotangs/react-theme
```

See the [English guide](https://github.com/RingoTangs/react-theme/blob/v0.1.1/README.md) for examples, configuration, and SSR integration. Package: [npm v0.1.1](https://www.npmjs.com/package/@ringotangs/react-theme/v/0.1.1).

## 简体中文

这是 `@ringotangs/react-theme` 首个带 Git Tag 的 GitHub 发布版本，提供轻量级 React 主题管理功能。

### 功能

- **主题模式：** 支持浅色、深色和跟随系统。系统模式会响应操作系统的明暗偏好变化。
- **偏好保存：** 从 localStorage 恢复已选择的模式，并跨标签页同步变化。存储不可用时，仍可切换当前页面的主题。
- **React API：** 使用 `ThemeProvider` 包裹应用，通过 `useTheme` 获取所选模式、实际明暗主题，并切换模式。
- **自定义配置：** 可设置默认主题、存储键和深色类名。Provider 管理根元素的主题类名和配色方案，应用通过 CSS 提供具体颜色。
- **SSR 支持：** 保持服务端与客户端首次渲染一致。使用 `getThemeScript` 在首次绘制前应用根元素样式，减少主题闪烁。脚本与 Provider 必须使用相同配置。
- **Vite 集成：** 从 `@ringotangs/react-theme/vite` 导入 `reactTheme`，在开发和生产环境自动注入初始化脚本。
- **产物格式：** 提供 TypeScript 类型声明及 ESM/CJS 构建。

### 兼容范围

- React：`^18.2.0 || ^19.0.0`。
- Vite 插件：`^5.1.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`。

### 安装

```sh
pnpm add @ringotangs/react-theme
```

使用示例、配置和 SSR 接入方式见[中文指南](https://github.com/RingoTangs/react-theme/blob/v0.1.1/README.zh-CN.md)。安装包见 [npm v0.1.1](https://www.npmjs.com/package/@ringotangs/react-theme/v/0.1.1)。
