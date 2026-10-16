# v0.1.2

2026-10-16

## English

This release improves API documentation for `@ringotangs/react-theme`. There are no new public APIs, runtime behavior changes, or breaking changes. No migration is required.

### Documentation

- **React API:** Add JSDoc for `ThemeProvider`, `useTheme`, and the theme context, including configuration defaults, selected versus resolved themes, and errors when used incorrectly.
- **Theme behavior:** Clarify stored preference priority, SSR and first client render behavior, system theme detection, and fallback behavior when localStorage is unavailable.
- **Initialization script:** Document `getThemeScript` options, return value, placement in `<head>`, and the requirement to share configuration with `ThemeProvider`.
- **Vite integration:** Clarify initialization script injection and the existing behavior that skips injection when a script with the ID `react-theme-script` is already present.
- **Types and utilities:** Document theme types, constants, validation, and storage helpers, including their defaults and SSR behavior.

All behaviors described above already existed in v0.1.1; this release documents them more clearly.

Full changes: [v0.1.1…v0.1.2](https://github.com/RingoTangs/react-theme/compare/v0.1.1...v0.1.2).

## 简体中文

本次发布完善了 `@ringotangs/react-theme` 的 API 文档，没有新增公共 API、运行时行为变更或破坏性变更，无需迁移。

### 文档更新

- **React API：** 为 `ThemeProvider`、`useTheme` 和主题上下文补充 JSDoc，说明配置默认值、所选模式与实际明暗主题的区别，以及错误用法对应的异常。
- **主题行为：** 明确已保存偏好的优先级、SSR 与客户端首次渲染行为、系统主题检测，以及 localStorage 不可用时的回退行为。
- **初始化脚本：** 补充 `getThemeScript` 的配置项、返回值、在 `<head>` 中的放置方式，以及与 `ThemeProvider` 保持配置一致的要求。
- **Vite 集成：** 明确初始化脚本的注入方式，以及存在 ID 为 `react-theme-script` 的脚本时跳过注入的现有行为。
- **类型与工具函数：** 为主题类型、常量、校验和存储工具补充说明，涵盖默认值及 SSR 行为。

上述行为均已存在于 v0.1.1，本次仅完善文档说明。

完整变更：[v0.1.1…v0.1.2](https://github.com/RingoTangs/react-theme/compare/v0.1.1...v0.1.2)。
