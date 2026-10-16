import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
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

const fixture = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(fixture, '../../..')
const rootRequire = createRequire(path.join(repo, 'package.json'))
// CI installs the selected version outside the workspace; this script never installs.
const args = process.argv.slice(2)
assert.ok(
  args.length === 0 || (args.length === 2 && args[0] === '--vite-dir'),
  'Usage: verify.mjs [--vite-dir /absolute/consumer-directory]',
)
const viteRequire = args.length
  ? createRequire(path.resolve(args[1], 'package.json'))
  : rootRequire
const viteManifest = realpathSync(viteRequire.resolve('vite/package.json'))
const version = JSON.parse(readFileSync(viteManifest, 'utf8')).version
assert.match(version, /^[5-8]\./)
if (process.env.EXPECTED_VITE) {
  const expected = process.env.EXPECTED_VITE
  assert.ok(
    expected.includes('.')
      ? version === expected
      : version.split('.')[0] === expected,
    `Expected Vite ${expected}, resolved ${version}`,
  )
}
const consumer = mkdtempSync(path.join(tmpdir(), 'react-theme-vite-consumer-'))
const link = (name, manifest) => {
  const destination = path.join(consumer, 'node_modules', name)
  mkdirSync(path.dirname(destination), { recursive: true })
  symlinkSync(path.dirname(realpathSync(manifest)), destination, 'dir')
}
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
  writeFileSync(
    path.join(consumer, 'package.json'),
    '{"private":true,"type":"module"}\n',
  )
  const manifest = JSON.parse(
    readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
  )
  assert.equal(
    manifest.peerDependencies.vite,
    '^5.1.0 || ^6.0.0 || ^7.0.0 || ^8.0.0',
  )
  assert.equal(manifest.peerDependencies.react, '^18.2.0 || ^19.0.0')
  assert.equal(manifest.peerDependenciesMeta.vite.optional, true)
  assert.equal(manifest.peerDependenciesMeta.react.optional, true)
  // Inspect all runtime chunks, including shared chunks, rather than only the entry.
  for (const file of readdirSync(path.join(packageRoot, 'dist'))) {
    if (!/\.(?:mjs|cjs)$/.test(file)) continue
    assert.doesNotMatch(
      readFileSync(path.join(packageRoot, 'dist', file), 'utf8'),
      /\b(?:from|import\s*\(|require\s*\()\s*['"]vite[/'"]/,
      `Unexpected Vite runtime dependency in ${file}`,
    )
  }
  link('react', rootRequire.resolve('react/package.json'))
  // With no Vite present, both core formats must remain usable.
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    assert.throws(() => require.resolve('vite'));
    for (const core of [await import('@ringotangs/react-theme'), require('@ringotangs/react-theme')])
      assert.equal(typeof core.getThemeScript, 'function');
  `,
    ],
    { cwd: consumer, stdio: 'inherit' },
  )
  link('vite', viteManifest)
  link('@types/node', rootRequire.resolve('@types/node/package.json'))
  for (const file of ['runtime.mjs', 'consumer.mts'])
    copyFileSync(path.join(fixture, file), path.join(consumer, file))
  execFileSync(process.execPath, ['runtime.mjs', version], {
    cwd: consumer,
    stdio: 'inherit',
  })
  const ts = rootRequire('typescript')
  const program = ts.createProgram([path.join(consumer, 'consumer.mts')], {
    noEmit: true,
    strict: true,
    skipLibCheck: false,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    types: ['node'],
    typeRoots: [path.join(consumer, 'node_modules/@types')],
  })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => consumer,
      getNewLine: () => '\n',
    }),
  )
  const viteRoot = path.dirname(viteManifest)
  assert.ok(
    program
      .getSourceFiles()
      .some((file) =>
        realpathSync(file.fileName).startsWith(
          `${viteRoot}${path.sep}types${path.sep}`,
        ),
      ),
    'TypeScript must load the selected Vite declarations',
  )
  process.stdout.write(
    `PASS: Vite ${version} packed ESM import, types (skipLibCheck=false), dev/build HTML, synchronous head script, deduplication; core ESM/CJS without Vite\n`,
  )
} finally {
  rmSync(consumer, { recursive: true, force: true })
}
