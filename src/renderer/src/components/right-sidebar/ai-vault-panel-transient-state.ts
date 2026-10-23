import { useState, useSyncExternalStore } from 'react'
import type { AiVaultScope } from '../../../../shared/ai-vault-types'
import { DEFAULT_AI_VAULT_SCOPE } from './ai-vault-scope-state'

const MAX_DISCLOSURE_ENTRIES = 512

type AiVaultPanelTransientState = {
  preferredScope: AiVaultScope
  collapsedGroups: ReadonlySet<string>
  expandedSessionIds: ReadonlySet<string>
}

function withDisclosureKey(
  current: ReadonlySet<string>,
  key: string,
  open = !current.has(key)
): ReadonlySet<string> {
  if (current.has(key) === open) {
    return current
  }
  const next = new Set(current)
  if (open) {
    next.add(key)
    const oldest = next.values().next().value
    if (next.size > MAX_DISCLOSURE_ENTRIES && oldest !== undefined) {
      next.delete(oldest)
    }
  } else {
    next.delete(key)
  }
  return next
}

function createPanelState() {
  let snapshot: AiVaultPanelTransientState = {
    preferredScope: DEFAULT_AI_VAULT_SCOPE,
    collapsedGroups: new Set(),
    expandedSessionIds: new Set()
  }
  const listeners = new Set<() => void>()
  const update = (next: AiVaultPanelTransientState): void => {
    if (snapshot === next) {
      return
    }
    snapshot = next
    for (const listener of listeners) {
      listener()
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    selectScope: (preferredScope: AiVaultScope) => {
      if (snapshot.preferredScope !== preferredScope) {
        update({ ...snapshot, preferredScope })
      }
    },
    toggleGroup: (key: string) =>
      update({ ...snapshot, collapsedGroups: withDisclosureKey(snapshot.collapsedGroups, key) }),
    toggleSessionDetails: (sessionId: string) =>
      update({
        ...snapshot,
        expandedSessionIds: withDisclosureKey(snapshot.expandedSessionIds, sessionId)
      }),
    expandSessionDetails: (sessionId: string) => {
      const expandedSessionIds = withDisclosureKey(snapshot.expandedSessionIds, sessionId, true)
      if (expandedSessionIds !== snapshot.expandedSessionIds) {
        update({ ...snapshot, expandedSessionIds })
      }
    }
  }
}

// Sidebar navigation unmounts the panel; its choices last until this renderer reloads.
const sidebarState = createPanelState()

export function useAiVaultPanelTransientState(local = false) {
  const [state] = useState(() => (local ? createPanelState() : sidebarState))
  const snapshot = useSyncExternalStore(state.subscribe, state.getSnapshot)
  return {
    ...snapshot,
    selectScope: state.selectScope,
    toggleGroup: state.toggleGroup,
    toggleSessionDetails: state.toggleSessionDetails,
    expandSessionDetails: state.expandSessionDetails
  }
}
