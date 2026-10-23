// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeWorktree } from '@/store/slices/worktrees-slice-test-fixtures'
import type { Worktree } from '../../../../../../shared/worktree/types'
import { useSourceControlPanelViewState } from './use-panel-view-state'

let container: HTMLDivElement
let root: Root
let prefix: string
let nextPrefix = 0

function workspace(id: string, overrides: Partial<Worktree> = {}): Worktree {
  return makeWorktree({ id: `${prefix}-${id}`, repoId: 'repo', hostId: 'local', ...overrides })
}

function Probe({ worktree }: { worktree: Worktree | null }) {
  const { collapsedSections, toggleSection } = useSourceControlPanelViewState({
    activeWorktreeId: worktree?.id ?? null,
    activeWorktree: worktree,
    settings: null,
    updateSettings: vi.fn()
  })
  return (
    <>
      {['unstaged', 'history'].map((section) => (
        <button
          key={section}
          data-section={section}
          aria-expanded={!collapsedSections.has(section)}
          onClick={() => toggleSection(section)}
        >
          {section}
        </button>
      ))}
    </>
  )
}

function render(worktree: Worktree | null): void {
  act(() => root.render(<Probe worktree={worktree} />))
}

function expanded(section = 'unstaged'): string | null {
  return (
    container.querySelector(`[data-section="${section}"]`)?.getAttribute('aria-expanded') ?? null
  )
}

function toggle(section = 'unstaged'): void {
  act(() => {
    container
      .querySelector(`[data-section="${section}"]`)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function remount(worktree: Worktree | null): void {
  act(() => root.unmount())
  root = createRoot(container)
  render(worktree)
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  prefix = `section-state-${++nextPrefix}`
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('Source Control session disclosure choices', () => {
  it('restores mixed choices after remount and preserves rapid toggles', () => {
    const a = workspace('a')
    render(a)
    toggle()
    toggle('history')
    remount(a)
    expect(expanded()).toBe('false')
    expect(expanded('history')).toBe('true')
    act(() => {
      toggle()
      toggle()
    })
    expect(expanded()).toBe('false')
  })

  it('isolates workspaces and restores the original choices on return', () => {
    const a = workspace('a')
    render(a)
    toggle()
    render(workspace('b'))
    expect(expanded()).toBe('true')
    expect(expanded('history')).toBe('false')
    render(a)
    expect(expanded()).toBe('false')
  })

  it.each([
    { hostId: 'ssh:other' as const },
    { runtimeOwnerEnvironmentId: 'other-runtime' },
    { instanceId: 'replacement' }
  ])('isolates the same locator with a different owner or occupant: %j', (replacement) => {
    const a = workspace('a', { instanceId: 'original' })
    render(a)
    toggle()
    render({ ...a, ...replacement })
    expect(expanded()).toBe('true')
    render(a)
    expect(expanded()).toBe('false')
  })

  it('retains canonical identity across locator changes', () => {
    const a = workspace('a', {
      identity: { key: `${prefix}-occupant`, executionHostId: 'local', instanceId: 'original' }
    })
    render(a)
    toggle()
    remount({ ...a, id: `${prefix}-renamed` })
    expect(expanded()).toBe('false')
  })

  it('restores defaults and does not persist choices without a workspace', () => {
    const a = workspace('a')
    render(a)
    toggle()
    toggle()
    remount(a)
    expect(expanded()).toBe('true')
    expect(expanded('history')).toBe('false')
    render(null)
    toggle()
    expect(expanded()).toBe('true')
  })

  it('evicts old non-default choices while preserving recently visited workspaces', () => {
    const first = workspace('first')
    const second = workspace('second')
    render(first)
    toggle()
    render(second)
    toggle()
    for (let index = 0; index < 510; index++) {
      render(workspace(`filler-${index}`))
      toggle()
    }
    render(first)
    expect(expanded()).toBe('false')
    render(workspace('overflow'))
    toggle()
    render(second)
    expect(expanded()).toBe('true')
    render(first)
    expect(expanded()).toBe('false')
  })
})
