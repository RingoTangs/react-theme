import assert from 'node:assert/strict'
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { createServer } from 'vite'

async function main() {
  const repo = process.argv[2]
  const spa = path.join(repo, 'apps/react-spa')
  const spaRequire = createRequire(path.join(spa, 'package.json'))
  const server = await createServer({
    root: spa,
    configFile: path.join(spa, 'vite.config.ts'),
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const container = server.environments.client.pluginContainer
    const importers = [
      path.join(spa, 'src/main.tsx'),
      path.join(repo, 'dist/index.mjs'),
      spaRequire.resolve('react-dom/client'),
    ]
    for (const name of [
      'react',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom',
      'react-dom/client',
    ]) {
      const expected = realpathSync(spaRequire.resolve(name))
      let sharedId
      for (const importer of importers) {
        const result = await container.resolveId(name, importer)
        assert.ok(result, `Vite did not resolve ${name} from ${importer}`)
        const id = result.id.split('?')[0]
        if (sharedId === undefined) sharedId = id
        assert.equal(
          id,
          sharedId,
          `${name} must share one Vite module ID across importers`,
        )
        // Vite may serve a prebundled file; verify its recorded source as well.
        const optimizer = server.environments.client.depsOptimizer
        const optimized =
          optimizer?.metadata.optimized[name] ??
          optimizer?.metadata.discovered[name]
        assert.equal(
          realpathSync(optimized?.file === id ? optimized.src : id),
          expected,
          `${name} must resolve to the SPA copy from ${importer}`,
        )
      }
      process.stdout.write(`PASS: Vite dedupes ${name} to ${expected}\n`)
    }
  } finally {
    await server.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
