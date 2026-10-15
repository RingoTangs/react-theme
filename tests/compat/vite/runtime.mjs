import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import process from 'node:process'
import { getThemeScript } from '@ringotangs/react-theme'
import { reactTheme } from '@ringotangs/react-theme/vite'
import { build, createServer, version } from 'vite'

async function main() {
  assert.equal(version, process.argv[2])
  const html =
    '<!doctype html><html><head><title>Compatibility</title></head><body></body></html>'
  const root = process.cwd()
  await writeFile('index.html', html)

  function check(output, options) {
    const opening = '<script id="react-theme-script">'
    assert.equal(output.match(/id="react-theme-script"/g)?.length, 1)
    // Exact opening excludes src, async, defer and type="module".
    assert.ok(output.includes(`${opening}${getThemeScript(options)}</script>`))
    assert.ok(output.indexOf(opening) > output.indexOf('<head>'))
    assert.ok(output.indexOf(opening) < output.indexOf('<title>'))
  }

  for (const options of [
    undefined,
    {
      defaultTheme: 'dark',
      storageKey: '</script>"&',
      darkClassName: 'theme"<>&',
    },
  ]) {
    const plugins = () => [
      reactTheme(options),
      reactTheme({ defaultTheme: 'light' }),
    ]
    const server = await createServer({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: plugins(),
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'custom',
    })
    try {
      const first = await server.transformIndexHtml('/index.html', html)
      check(first, options)
      check(await server.transformIndexHtml('/index.html', first), options)
      check(await server.transformIndexHtml('/other.html', html), options)
    } finally {
      await server.close()
    }
    const result = await build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: plugins(),
      build: { write: false },
    })
    assert.ok(!Array.isArray(result) && 'output' in result)
    const asset = result.output.find((entry) => entry.fileName === 'index.html')
    assert.equal(asset?.type, 'asset')
    check(String(asset.source), options)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
