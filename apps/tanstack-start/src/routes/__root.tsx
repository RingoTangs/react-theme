import type { ReactElement, ReactNode } from 'react'
import { getThemeScript, ThemeProvider } from '@ringotangs/react-theme'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import styles from '../styles.css?url'
import { themeOptions } from '../theme-options'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'TanStack Start · React Theme' },
    ],
    links: [{ rel: 'stylesheet', href: styles }],
  }),
  component: Outlet,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* html 的 suppressHydrationWarning 仅处理脚本修改根元素 class/style 的预期差异。 */}
        {/* 首次绘制前应用配色；与下方 Provider 共用配置，保持主题规则一致。 */}
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
