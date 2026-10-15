import type { ReactElement } from 'react'
import type { ThemeMode, ThemeProviderProps } from './index'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from './index'

function Consumer(): ReactElement {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <>
      <output>
        {theme}/{resolvedTheme}
      </output>
      {(['light', 'dark', 'system'] as const).map((mode) => (
        <button key={mode} onClick={() => setTheme(mode)}>
          {mode}
        </button>
      ))}
    </>
  )
}

function app(props: ThemeProviderProps = {}): ReactElement {
  return (
    <ThemeProvider {...props}>
      <Consumer />
    </ThemeProvider>
  )
}

function media(initial = false) {
  let matches = initial
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const query = {
    get matches() {
      return matches
    },
    addEventListener: vi.fn(
      (_name: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener)
      },
    ),
    removeEventListener: vi.fn(
      (_name: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener)
      },
    ),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  )
  return {
    listeners,
    query,
    change(next: boolean): void {
      matches = next
      act(() =>
        listeners.forEach((listener) =>
          listener({ matches } as MediaQueryListEvent),
        ),
      )
    },
  }
}

function storageEvent(
  key: string | null,
  newValue: string | null,
  storageArea?: Storage,
): void {
  act(() => {
    window.dispatchEvent(
      new StorageEvent('storage', { key, newValue, storageArea }),
    )
  })
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.className = 'existing'
  document.documentElement.style.colorScheme = ''
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('theme provider', () => {
  it('defaults to system and applies the system theme without writing storage', () => {
    media(true)
    const write = vi.spyOn(Storage.prototype, 'setItem')
    render(app())
    expect(screen.getByRole('status')).toHaveTextContent('system/dark')
    expect(document.documentElement).toHaveClass('existing', 'dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(write).not.toHaveBeenCalled()
  })

  it.each([null, 'invalid'])(
    'uses the configured default for stored %s',
    (stored) => {
      media()
      if (stored !== null) window.localStorage.setItem('custom', stored)
      render(app({ defaultTheme: 'dark', storageKey: 'custom' }))
      expect(screen.getByRole('status')).toHaveTextContent('dark/dark')
      expect(window.localStorage.getItem('custom')).toBe(stored)
    },
  )

  it('restores valid stored system rather than the explicit default', () => {
    media()
    window.localStorage.setItem('custom', 'system')
    render(app({ defaultTheme: 'dark', storageKey: 'custom' }))
    expect(screen.getByRole('status')).toHaveTextContent('system/light')
  })

  it('switches all modes and persists only to the configured key', () => {
    media(true)
    render(app({ storageKey: 'custom' }))
    for (const mode of ['light', 'dark', 'system'] as const) {
      fireEvent.click(screen.getByRole('button', { name: mode }))
      const resolved = mode === 'light' ? 'light' : 'dark'
      expect(screen.getByRole('status')).toHaveTextContent(
        `${mode}/${resolved}`,
      )
      expect(document.documentElement.classList.contains('dark')).toBe(
        resolved === 'dark',
      )
      expect(document.documentElement.style.colorScheme).toBe(resolved)
      expect(window.localStorage.getItem('custom')).toBe(mode)
    }
    expect(window.localStorage.getItem('theme')).toBeNull()
  })

  it('tracks system changes without persisting and preserves explicit selections', () => {
    const system = media()
    render(app())
    const write = vi.spyOn(Storage.prototype, 'setItem')
    system.change(true)
    expect(screen.getByRole('status')).toHaveTextContent('system/dark')
    expect(write).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'light' }))
    system.change(false)
    system.change(true)
    expect(screen.getByRole('status')).toHaveTextContent('light/light')
  })

  it('syncs storage changes without echo writes and filters unrelated events', () => {
    media()
    render(app({ storageKey: 'custom', defaultTheme: 'dark' }))
    const write = vi.spyOn(Storage.prototype, 'setItem')
    storageEvent('custom', 'light', window.localStorage)
    expect(screen.getByRole('status')).toHaveTextContent('light/light')
    storageEvent('other', 'dark')
    storageEvent('custom', 'dark', window.sessionStorage)
    expect(screen.getByRole('status')).toHaveTextContent('light/light')
    for (const value of ['invalid', null]) {
      storageEvent('custom', value)
      expect(screen.getByRole('status')).toHaveTextContent('dark/dark')
      storageEvent('custom', 'light')
    }
    storageEvent(null, null)
    expect(screen.getByRole('status')).toHaveTextContent('dark/dark')
    expect(write).not.toHaveBeenCalled()
  })

  it('restores new configuration without writing old preferences into the new key', () => {
    media()
    window.localStorage.setItem('first', 'dark')
    window.localStorage.setItem('second', 'light')
    const view = render(app({ storageKey: 'first' }))
    const write = vi.spyOn(Storage.prototype, 'setItem')
    view.rerender(app({ storageKey: 'second' }))
    expect(screen.getByRole('status')).toHaveTextContent('light/light')
    storageEvent('first', 'dark')
    expect(screen.getByRole('status')).toHaveTextContent('light/light')
    view.rerender(app({ storageKey: 'empty', defaultTheme: 'dark' }))
    expect(screen.getByRole('status')).toHaveTextContent('dark/dark')
    view.rerender(app({ storageKey: 'empty', defaultTheme: 'light' }))
    expect(screen.getByRole('status')).toHaveTextContent('light/light')
    expect(write).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'dark' }))
    expect(write).toHaveBeenCalledWith('empty', 'dark')
  })

  it('keeps a single subscription in strict mode and cleans up on unmount', () => {
    const system = media()
    window.localStorage.setItem('theme', 'dark')
    const write = vi.spyOn(Storage.prototype, 'setItem')
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const view = render(<StrictMode>{app()}</StrictMode>)
    expect(system.listeners.size).toBe(1)
    expect(screen.getByRole('status')).toHaveTextContent('dark/dark')
    expect(write).not.toHaveBeenCalled()
    view.unmount()
    expect(system.listeners.size).toBe(0)
    const added = add.mock.calls
      .filter(([name]) => name === 'storage')
      .map(([, listener]) => listener)
    const removed = remove.mock.calls
      .filter(([name]) => name === 'storage')
      .map(([, listener]) => listener)
    expect(removed).toEqual(added)
  })

  it.each(['missing', 'throws', 'subscription throws', 'no subscriptions'])(
    'handles media API: %s',
    (kind) => {
      const system = media()
      if (kind === 'missing') vi.stubGlobal('matchMedia', undefined)
      if (kind === 'throws')
        vi.stubGlobal('matchMedia', () => {
          throw new Error('unavailable')
        })
      if (kind === 'subscription throws')
        system.query.addEventListener.mockImplementation(() => {
          throw new Error('unavailable')
        })
      if (kind === 'no subscriptions')
        vi.stubGlobal('matchMedia', () => ({ matches: false }))
      render(app())
      expect(screen.getByRole('status')).toHaveTextContent('system/light')
      fireEvent.click(screen.getByRole('button', { name: 'dark' }))
      expect(screen.getByRole('status')).toHaveTextContent('dark/dark')
    },
  )

  it('handles inaccessible storage and write failures', () => {
    media(true)
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('denied')
    })
    render(app())
    expect(screen.getByRole('status')).toHaveTextContent('system/dark')
    fireEvent.click(screen.getByRole('button', { name: 'light' }))
    expect(screen.getByRole('status')).toHaveTextContent('light/light')
    expect(() =>
      storageEvent('theme', 'dark', window.sessionStorage),
    ).not.toThrow()
  })

  it('throws a clear error outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow(
      'useTheme must be used within a ThemeProvider',
    )
  })

  it.each(['system', 'dark', 'light'] as ThemeMode[])(
    'hydrates %s consistently and restores without overwriting preferences',
    async (defaultTheme) => {
      media(true)
      window.localStorage.setItem('theme', 'dark')
      const snapshots: string[] = []
      function Snapshot(): ReactElement {
        const { theme, resolvedTheme } = useTheme()
        snapshots.push(`${theme}/${resolvedTheme}`)
        return (
          <span>
            {theme}/{resolvedTheme}
          </span>
        )
      }
      const tree = (
        <StrictMode>
          <ThemeProvider defaultTheme={defaultTheme}>
            <Snapshot />
          </ThemeProvider>
        </StrictMode>
      )
      const container = document.createElement('div')
      container.innerHTML = renderToString(tree)
      const initial = `${defaultTheme}/${defaultTheme === 'system' ? 'light' : defaultTheme}`
      expect(container.textContent).toBe(initial)
      document.body.append(container)
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
      const toggle = vi.spyOn(document.documentElement.classList, 'toggle')
      const write = vi.spyOn(Storage.prototype, 'setItem')
      const error = vi.spyOn(console, 'error')
      const recover = vi.fn()
      snapshots.length = 0
      let root: ReturnType<typeof hydrateRoot> | undefined
      try {
        await act(async () => {
          root = hydrateRoot(container, tree, { onRecoverableError: recover })
        })
        expect(snapshots[0]).toBe(initial)
        expect(container.textContent).toBe('dark/dark')
        expect(recover).not.toHaveBeenCalled()
        expect(error).not.toHaveBeenCalled()
        expect(write).not.toHaveBeenCalled()
        expect(toggle).not.toHaveBeenCalledWith('dark', false)
      } finally {
        await act(async () => root?.unmount())
        container.remove()
      }
    },
  )
})
