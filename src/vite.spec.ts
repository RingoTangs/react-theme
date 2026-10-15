// @vitest-environment node
import type { IndexHtmlTransformHook, Plugin } from 'vite'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { build, createServer } from 'vite'
import { afterEach, describe, expect, it } from 'vitest'
import { getThemeScript } from './getThemeScript'
import { reactTheme } from './vite'

const html =
  '<!doctype html><html><head><title>Theme</title></head><body></body></html>'
const options = {
  defaultTheme: 'dark',
  storageKey: 'spa-theme',
  darkClassName: 'theme-dark',
} as const
const roots: string[] = []

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  )
})

async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'react-theme-vite-'))
  roots.push(root)
  await writeFile(path.join(root, 'index.html'), html)
  return root
}

async function transform(plugin: Plugin, input = html): Promise<unknown> {
  const hook = plugin.transformIndexHtml
  if (typeof hook !== 'function')
    throw new Error('Expected a function HTML hook')
  // This hook uses neither Vite's plugin context nor the HTML transform context.
  return hook.call({} as ThisParameterType<IndexHtmlTransformHook>, input, {
    path: '/index.html',
    filename: '/index.html',
  })
}

function expectInjected(
  output: string,
  script = getThemeScript(options),
): void {
  expect(output.match(/id="react-theme-script"/g)).toHaveLength(1)
  const opening = '<script id="react-theme-script">'
  expect(output).toContain(`${opening}${script}</script>`)
  expect(output.indexOf(opening)).toBeGreaterThan(output.indexOf('<head>'))
  expect(output.indexOf(opening)).toBeLessThan(output.indexOf('<title>'))
}

describe('reactTheme', () => {
  it('uses the existing defaults and a synchronous head-prepend script', async () => {
    expect(await transform(reactTheme())).toEqual([
      {
        tag: 'script',
        attrs: { id: 'react-theme-script' },
        children: getThemeScript(),
        injectTo: 'head-prepend',
      },
    ])
  })

  it('forwards theme options including safely serialized storage keys', async () => {
    const custom = {
      defaultTheme: 'light',
      storageKey: '</script>"&',
      darkClassName: 'theme"<>&',
    } as const
    expect(await transform(reactTheme(custom))).toEqual([
      {
        tag: 'script',
        attrs: { id: 'react-theme-script' },
        children: getThemeScript(custom),
        injectTo: 'head-prepend',
      },
    ])
  })

  it.each([
    '"react-theme-script"',
    "'react-theme-script'",
    'react-theme-script',
  ])('does not replace an existing marked script with id=%s', async (id) => {
    expect(
      await transform(
        reactTheme(options),
        `<head><script id=${id}>existing()</script></head>`,
      ),
    ).toBeUndefined()
  })

  it('does not confuse unrelated script IDs with its own marker', async () => {
    expect(
      await transform(
        reactTheme(),
        '<script id="other-react-theme-script"></script>',
      ),
    ).toBeDefined()
  })

  it('injects once in development, across duplicate plugins and repeated transforms', async () => {
    const server = await createServer({
      root: await fixture(),
      configFile: false,
      logLevel: 'silent',
      plugins: [reactTheme(options), reactTheme({ defaultTheme: 'light' })],
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'custom',
    })
    try {
      const first = await server.transformIndexHtml('/index.html', html)
      expectInjected(first)
      expectInjected(await server.transformIndexHtml('/index.html', first))
      // Independent requests must still receive their own initialization script.
      expectInjected(await server.transformIndexHtml('/other.html', html))
    } finally {
      await server.close()
    }
  })

  it('injects once in a real production HTML build', async () => {
    const result = await build({
      root: await fixture(),
      configFile: false,
      logLevel: 'silent',
      plugins: [reactTheme(options), reactTheme(options)],
      build: { write: false },
    })
    if (Array.isArray(result) || !('output' in result))
      throw new Error('Expected a single build')
    const asset = result.output.find(
      (output) => output.fileName === 'index.html',
    )
    if (!asset || asset.type !== 'asset') throw new Error('Expected built HTML')
    expectInjected(String(asset.source))
  })
})
