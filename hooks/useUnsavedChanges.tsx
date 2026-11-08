'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmModal } from '@/components/ui/Modal'

/**
 * Protects unsaved form edits:
 *  - closing/reloading the tab triggers the browser's own "leave site?" prompt
 *  - clicking any in-app link, or calling `guard(action)` (Back / Cancel),
 *    shows an in-app confirmation instead of silently losing the edits
 * Render the returned `dialog` somewhere in the form.
 */
export function useUnsavedChanges(dirty: boolean) {
  const router = useRouter()
  const [pending, setPending] = useState<(() => void) | null>(null)
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // Intercept in-app link clicks (nav bar, sidebar, breadcrumbs…)
  useEffect(() => {
    if (!dirty) return
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.origin !== window.location.origin) return
      if (a.pathname === window.location.pathname) return
      e.preventDefault()
      e.stopPropagation()
      const href = a.pathname + a.search + a.hash
      setPending(() => () => router.push(href))
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [dirty, router])

  /** Run `action` now if nothing is unsaved, otherwise ask first. */
  const guard = useCallback((action: () => void) => {
    if (dirtyRef.current) setPending(() => action)
    else action()
  }, [])

  const dialog = (
    <ConfirmModal
      open={!!pending}
      onClose={() => setPending(null)}
      onConfirm={() => { const a = pending; setPending(null); dirtyRef.current = false; a?.() }}
      title="Discard your changes?"
      description="You have edits that haven't been saved. If you leave now they'll be lost."
      confirmLabel="Discard changes"
    />
  )

  return { guard, dialog }
}
