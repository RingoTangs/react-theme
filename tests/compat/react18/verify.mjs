import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

function report(message) {
  process.stdout.write(`${message}\n`)
}

const fixture = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(fixture, '../../..')
const spa = path.join(repo, 'apps/react-spa')
const localRequire = createRequire(path.join(spa, 'package.json'))
const rootRequire = createRequire(path.join(repo, 'package.json'))
// Exact minimum-version compatibility assertions; dependency declarations live in catalogs.react18.
const expected = {
  react: '18.2.0',
  'react-dom': '18.2.0',
  '@types/react': '18.2.79',
  '@types/react-dom': '18.2.25',
}

for (const [name, version] of Object.entries(expected)) {
  const manifest = localRequire.resolve(`${name}/package.json`)
  assert.ok(
    realpathSync(manifest) ===
      realpathSync(path.join(spa, 'node_modules', name, 'package.json')),
    `${name} must resolve from the SPA; run pnpm install in ${repo}`,
  )
  assert.equal(
    localRequire(`${name}/package.json`).version,
    version,
    `Unexpected ${name} version`,
  )
}
const rendererRequire = createRequire(
  localRequire.resolve('react-dom/package.json'),
)
assert.equal(
  realpathSync(rendererRequire.resolve('react')),
  realpathSync(localRequire.resolve('react')),
)
const rendererTypesRequire = createRequire(
  localRequire.resolve('@types/react-dom/package.json'),
)
assert.equal(
  realpathSync(rendererTypesRequire.resolve('@types/react/package.json')),
  realpathSync(localRequire.resolve('@types/react/package.json')),
)
report(
  'PASS: SPA resolves React/ReactDOM 18.2.0 and matching React 18 types; no root React 19 fallback',
)

for (const [label, projectRequire] of [
  ['root', rootRequire],
  ['Start', createRequire(path.join(repo, 'apps/tanstack-start/package.json'))],
]) {
  assert.match(projectRequire('react').version, /^19\./)
  assert.match(projectRequire('react-dom/package.json').version, /^19\./)
  assert.match(projectRequire('@types/react/package.json').version, /^19\./)
  assert.match(projectRequire('@types/react-dom/package.json').version, /^19\./)
  report(
    `PASS: ${label} resolves React ${projectRequire('react').version} and React 19 types`,
  )
}
execFileSync(process.execPath, [path.join(fixture, 'resolve.mjs'), repo], {
  stdio: 'inherit',
})

const consumer = mkdtempSync(path.join(tmpdir(), 'react-theme-react18-'))
try {
  const packed = JSON.parse(
    execFileSync(
      'npm',
      ['pack', '--ignore-scripts', '--json', '--pack-destination', consumer],
      { cwd: repo, encoding: 'utf8' },
    ),
  )[0]
  const packageRoot = path.join(
    consumer,
    'node_modules/@ringotangs/react-theme',
  )
  mkdirSync(packageRoot, { recursive: true })
  execFileSync('tar', [
    '-xzf',
    path.join(consumer, packed.filename),
    '-C',
    packageRoot,
    '--strip-components=1',
  ])
  const manifest = JSON.parse(
    readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
  )
  assert.equal(manifest.peerDependencies.react, '^18.2.0 || ^19.0.0')
  for (const condition of ['import', 'require'])
    for (const entry of Object.values(manifest.exports)) {
      assert.ok(existsSync(path.join(packageRoot, entry[condition].default)))
      assert.ok(existsSync(path.join(packageRoot, entry[condition].types)))
    }
  writeFileSync(
    path.join(consumer, 'package.json'),
    '{"private":true,"type":"module"}\n',
  )
  for (const name of [
    'react',
    'react-dom',
    '@types/react',
    '@types/react-dom',
  ]) {
    const destination = path.join(consumer, 'node_modules', name)
    mkdirSync(path.dirname(destination), { recursive: true })
    symlinkSync(
      path.dirname(realpathSync(localRequire.resolve(`${name}/package.json`))),
      destination,
      'dir',
    )
  }
  for (const file of ['runtime.mjs', 'consumer.tsx', 'consumer.cts'])
    copyFileSync(path.join(fixture, file), path.join(consumer, file))
  for (const format of ['esm', 'cjs']) {
    execFileSync(process.execPath, ['runtime.mjs', format, repo], {
      cwd: consumer,
      stdio: 'inherit',
    })
  }

  const ts = rootRequire('typescript')
  const options = {
    noEmit: true,
    strict: true,
    skipLibCheck: false,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    types: ['react', 'react-dom'],
    typeRoots: [path.join(consumer, 'node_modules/@types')],
  }
  const program = ts.createProgram(
    ['consumer.tsx', 'consumer.cts'].map((file) => path.join(consumer, file)),
    options,
  )
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (file) => file,
        getCurrentDirectory: () => consumer,
        getNewLine: () => '\n',
      }),
    )
  }
  for (const name of ['react', 'react-dom']) {
    const declaration = realpathSync(
      localRequire.resolve(`@types/${name}/package.json`),
    )
    assert.ok(
      program
        .getSourceFiles()
        .some(
          (file) =>
            realpathSync(file.fileName) ===
            path.join(path.dirname(declaration), 'index.d.ts'),
        ),
    )
  }
  report(
    'PASS: packed ESM JSX and CJS declarations compile with React 18 types and skipLibCheck=false',
  )
} finally {
  rmSync(consumer, { recursive: true, force: true })
}
