import { useCallback, useMemo, useRef, useState } from 'react'
import { getWorktreeHostIdentity } from '../../../../../../shared/worktree/host-qualified-identity'
import { useSourceControlSectionCollapseState } from './section-collapse-state'
import { resolveSourceControlGroupOrder } from '../listing/section-order'
import { getNextSourceControlViewMode } from './header-toolbar'
import { normalizeSourceControlViewMode } from '../commit/commit-drafts'
import type { SourceControlStoreActions } from '../listing/use-store-actions'
import type { SourceControlWorktreeContext } from '../listing/use-worktree-context'

/**
 * Local presentation state for the Source Control panel: filter, collapsed sections/directories,
 * list-vs-tree mode and the base-ref dialog, plus the per-worktree reset that keeps a worktree
 * switch from inheriting the previous worktree's view.
 */
export function useSourceControlPanelViewState({
  activeWorktreeId,
  activeWorktree,
  settings,
  updateSettings
}: {
  activeWorktreeId: string | null
  activeWorktree: SourceControlWorktreeContext['activeWorktree']
  settings: SourceControlWorktreeContext['settings']
  updateSettings: SourceControlStoreActions['updateSettings']
}) {
  const sourceControlRef = useRef<HTMLDivElement | null>(null)
  // Why: virtualize against the panel's shared scroller; use state (not a ref) so lists re-render and start observing once the element attaches.
  const [fileListScrollElement, setFileListScrollElement] = useState<HTMLDivElement | null>(null)
  const isMac = useMemo(() => navigator.userAgent.includes('Mac'), [])
  const [filterExpanded, setFilterExpanded] = useState(false)
  const sectionStateKey = activeWorktree
    ? JSON.stringify([
        activeWorktree.runtimeOwnerEnvironmentId ?? null,
        activeWorktree.identity?.key ?? getWorktreeHostIdentity(activeWorktree),
        activeWorktree.instanceId ?? null
      ])
    : null
  const { collapsedSections, toggleSection } = useSourceControlSectionCollapseState(sectionStateKey)
  const persistedSourceControlViewMode = normalizeSourceControlViewMode(
    settings?.sourceControlViewMode
  )
  const sourceControlViewMode = persistedSourceControlViewMode
  const sourceControlGroupOrder = resolveSourceControlGroupOrder(settings?.sourceControlGroupOrder)
  const [collapsedTreeDirs, setCollapsedTreeDirs] = useState<Set<string>>(new Set())
  const [baseRefDialogOpen, setBaseRefDialogOpen] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')
  const isGitHistoryExpanded = !collapsedSections.has('history')

  const handleToggleSourceControlViewMode = useCallback(() => {
    if (!settings) {
      return
    }
    updateSettings({
      sourceControlViewMode: getNextSourceControlViewMode(sourceControlViewMode)
    })
  }, [settings, sourceControlViewMode, updateSettings])

  // Why: reset during render instead of key-remounting on switch (which caused a Windows IPC storm).
  const [viewStateWorktreeId, setViewStateWorktreeId] = useState(activeWorktreeId)
  if (viewStateWorktreeId !== activeWorktreeId) {
    setViewStateWorktreeId(activeWorktreeId)
    setFilterExpanded(false)
    setCollapsedTreeDirs(new Set())
    setBaseRefDialogOpen(false)
    // Why: don't reset defaultBaseRef here — it's repo-scoped (resolved on activeRepo change); resetting would clobber non-main defaults.
    setFilterQuery('')
    // Why: don't reset commit-in-flight state — it's per-worktree; resetting would re-enable Commit for an incoming worktree mid-commit.
  }

  const toggleTreeDir = useCallback((key: string) => {
    setCollapsedTreeDirs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  return {
    baseRefDialogOpen,
    collapsedSections,
    collapsedTreeDirs,
    fileListScrollElement,
    filterExpanded,
    filterQuery,
    handleToggleSourceControlViewMode,
    isGitHistoryExpanded,
    isMac,
    setBaseRefDialogOpen,
    setFileListScrollElement,
    setFilterExpanded,
    setFilterQuery,
    sourceControlGroupOrder,
    sourceControlRef,
    sourceControlViewMode,
    toggleSection,
    toggleTreeDir
  }
}

export type SourceControlPanelViewState = ReturnType<typeof useSourceControlPanelViewState>
