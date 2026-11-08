'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  /** 'sheet' slides up from the bottom on phones (centred dialog on wider screens) */
  variant?: 'dialog' | 'sheet'
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal: role="dialog" + aria-modal, labelled by its title,
 * focus moves in on open, Tab stays inside, Escape closes, and focus returns
 * to whatever opened it. Background scrolling is locked while open.
 */
export function Modal({ open, onClose, title, children, className, variant = 'dialog' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus the first field/button inside (or the panel itself)
    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>('[autofocus], input, select, textarea') ?? panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return }
      if (e.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (items.length === 0) { e.preventDefault(); return }
      const firstEl = items[0], lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus() }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const sheet = variant === 'sheet'

  return createPortal(
    <div
      className={cn('fixed inset-0 z-[60] flex justify-center', sheet ? 'items-end sm:items-center sm:p-4' : 'items-center p-4')}
      style={sheet ? undefined : { paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-lg overflow-y-auto overscroll-contain outline-none',
          'bg-[var(--bg-elevated)] border border-[var(--border-strong)] shadow-xl animate-slide-up',
          sheet
            ? 'rounded-t-2xl sm:rounded-2xl max-h-[85dvh] sm:max-h-[90dvh]'
            : 'rounded-2xl max-h-[90vh] max-h-[90dvh]',
          className
        )}
        style={sheet ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}
      >
        {sheet && <div aria-hidden className="sm:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--border-strong)]" />}
        {title ? (
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-[var(--border)]">
            <h2 id={titleId} className="text-base font-semibold text-[var(--fg)]">{title}</h2>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10">
            <X className="w-4 h-4" />
          </Button>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  /** Use 'primary' for non-destructive confirmations */
  tone?: 'destructive' | 'primary'
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  loading,
  tone = 'destructive',
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-[var(--fg-muted)] mb-6">{description}</p>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={tone} className="flex-1" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
