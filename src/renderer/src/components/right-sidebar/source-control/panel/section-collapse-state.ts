import { useCallback, useState } from 'react'
import { BoundedMap } from '../../../../../../shared/bounded-map'

const DEFAULT_COLLAPSED_SECTIONS = new Set(['history'])
const collapsedSectionsByWorkspace = new BoundedMap<string, Set<string>>({ maxEntries: 512 })

function readCollapsedSections(workspaceKey: string | null): Set<string> {
  return workspaceKey
    ? (collapsedSectionsByWorkspace.get(workspaceKey) ?? DEFAULT_COLLAPSED_SECTIONS)
    : DEFAULT_COLLAPSED_SECTIONS
}

export function useSourceControlSectionCollapseState(workspaceKey: string | null) {
  const [rendered, setRendered] = useState(() => ({
    workspaceKey,
    collapsedSections: readCollapsedSections(workspaceKey)
  }))
  const collapsedSections =
    rendered.workspaceKey === workspaceKey
      ? rendered.collapsedSections
      : readCollapsedSections(workspaceKey)

  const toggleSection = useCallback(
    (section: string) => {
      if (!workspaceKey) {
        return
      }
      const next = new Set(readCollapsedSections(workspaceKey))
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      // Why: retain only non-default choices across sidebar tab unmounts in this renderer session.
      if (next.size === 1 && next.has('history')) {
        collapsedSectionsByWorkspace.delete(workspaceKey)
      } else {
        collapsedSectionsByWorkspace.set(workspaceKey, next)
      }
      setRendered({ workspaceKey, collapsedSections: next })
    },
    [workspaceKey]
  )

  return { collapsedSections, toggleSection }
}
