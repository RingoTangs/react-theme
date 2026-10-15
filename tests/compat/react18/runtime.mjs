import assert from 'node:assert/strict'
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'

function report(message) {
  process.stdout.write(`${message}\n`)
}

async function main() {
  const require = createRequire(import.meta.url)
  const React = require('react')
  const { createElement: h, StrictMode } = React
  assert.equal(React.version, '18.2.0')
  assert.equal(require('react-dom/package.json').version, '18.2.0')
  const libraryRequire = createRequire(
    require.resolve('@ringotangs/react-theme'),
  )
  assert.equal(
    realpathSync(libraryRequire.resolve('react')),
    realpathSync(require.resolve('react')),
  )
  assert.equal(libraryRequire('react'), React)
  const library =
    process.argv[2] === 'esm'
      ? await import('@ringotangs/react-theme')
      : require('@ringotangs/react-theme')
  const { ThemeProvider, useTheme, getThemeScript, themeModes } = library
  const { renderToString } = require('react-dom/server')
  const options = {
    defaultTheme: 'system',
    storageKey: 'compat-theme',
    darkClassName: 'compat-dark',
  }
  // eslint-disable-next-line react/component-hook-factories -- This CLI creates one fixed consumer per isolated process after selecting the package format.
  function Consumer() {
    const { theme, resolvedTheme, setTheme } = useTheme()
    return h(
      'main',
      null,
      h('output', null, `${theme}/${resolvedTheme}`),
      ...themeModes.map((mode) =>
        h('button', { key: mode, onClick: () => setTheme(mode) }, mode),
      ),
    )
  }
  function tree(props = options) {
    return h(StrictMode, null, h(ThemeProvider, props, h(Consumer)))
  }
  assert.equal(typeof globalThis.window, 'undefined')
  const markup = renderToString(tree())
  assert.match(markup, /system\/light/)
  const script = getThemeScript(options)
  report(
    `PASS (${process.argv[2]}): SSR and script generation without browser globals`,
  )

  // Only jsdom is loaded from the root toolchain, never React or its renderer.
  const rootRequire = createRequire(path.join(process.argv[3], 'package.json'))
  const { JSDOM } = rootRequire('jsdom')
  const dom = new JSDOM(
    `<!doctype html><html class="unrelated"><head></head><body><div id="root">${markup}</div></body></html>`,
    { url: 'http://react18.local', runScripts: 'outside-only' },
  )
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  let systemDark = true
  const listeners = new Set()
  dom.window.matchMedia = () => ({
    get matches() {
      return systemDark
    },
    addEventListener: (_event, listener) => listeners.add(listener),
    removeEventListener: (_event, listener) => listeners.delete(listener),
  })
  const { hydrateRoot } = require('react-dom/client')
  const { act } = require('react-dom/test-utils')
  const rootElement = document.documentElement
  const container = document.getElementById('root')
  window.localStorage.setItem(options.storageKey, 'dark')
  const writes = []
  const originalSet = window.Storage.prototype.setItem
  window.Storage.prototype.setItem = function (key, value) {
    writes.push([key, value])
    originalSet.call(this, key, value)
  }
  dom.window.eval(script)
  assert.ok(rootElement.classList.contains(options.darkClassName))
  const toggles = []
  const originalToggle = rootElement.classList.toggle.bind(
    rootElement.classList,
  )
  rootElement.classList.toggle = (name, force) => {
    toggles.push([name, force])
    return originalToggle(name, force)
  }
  const errors = []
  const originalError = console.error
  console.error = (...args) => errors.push(args.map(String).join(' '))
  let root
  function check(mode, resolved, name = options.darkClassName) {
    assert.equal(
      container.querySelector('output').textContent,
      `${mode}/${resolved}`,
    )
    assert.equal(rootElement.classList.contains(name), resolved === 'dark')
    assert.ok(rootElement.classList.contains('unrelated'))
    assert.equal(rootElement.style.colorScheme, resolved)
    assert.equal(window.localStorage.getItem(options.storageKey), mode)
  }
  try {
    await act(async () => {
      root = hydrateRoot(container, tree(), {
        onRecoverableError: (error) => errors.push(error.message),
      })
    })
    check('dark', 'dark')
    assert.deepEqual(writes, [])
    assert.ok(
      !toggles.some(
        ([name, force]) => name === options.darkClassName && force === false,
      ),
    )
    report(
      `PASS (${process.argv[2]}): stored Dark restored; hydration has no errors, theme fallback or storage overwrite`,
    )

    for (const mode of themeModes) {
      await act(async () =>
        container
          .querySelectorAll('button')
          [themeModes.indexOf(mode)].dispatchEvent(
            new window.MouseEvent('click', { bubbles: true }),
          ),
      )
      check(mode, mode === 'system' ? 'dark' : mode)
    }
    const writeCount = writes.length
    for (const next of [false, true]) {
      systemDark = next
      await act(async () => {
        for (const listener of listeners) listener({ matches: next })
      })
      check('system', next ? 'dark' : 'light')
    }
    assert.equal(writes.length, writeCount)
    originalSet.call(window.localStorage, options.storageKey, 'dark')
    await act(async () =>
      window.dispatchEvent(
        new window.StorageEvent('storage', {
          key: options.storageKey,
          newValue: 'dark',
          storageArea: window.localStorage,
        }),
      ),
    )
    check('dark', 'dark')
    assert.equal(writes.length, writeCount)
    await act(async () =>
      root.render(tree({ ...options, darkClassName: undefined })),
    )
    check('dark', 'dark', 'dark')
    assert.equal(rootElement.classList.contains(options.darkClassName), false)
    assert.equal(writes.length, writeCount)
    assert.deepEqual(errors, [])
    report(
      `PASS (${process.argv[2]}): Light/Dark/System, system updates, cross-tab event, custom/default class and unchanged persistence`,
    )
  } finally {
    if (root) await act(async () => root.unmount())
    console.error = originalError
    dom.window.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
