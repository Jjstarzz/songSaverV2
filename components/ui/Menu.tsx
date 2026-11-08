'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MenuItem {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onSelect?: () => void
  href?: string
  destructive?: boolean
  hidden?: boolean
}

/**
 * Small actions menu ("⋯"). Keyboard: Enter/Space/↓ opens and focuses the
 * first item, ↑/↓ move, Escape closes and returns focus to the button.
 */
export function Menu({ items, label = 'More actions', className }: { items: MenuItem[]; label?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const visible = items.filter((i) => !i.hidden)

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!listRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('touchstart', onDown) }
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = [...(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
    const i = els.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btnRef.current?.focus() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus() }
    else if (e.key === 'Tab') setOpen(false)
  }

  if (visible.length === 0) return null

  const itemClass = (d?: boolean) => cn(
    'w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm text-left outline-none',
    'hover:bg-[var(--bg-hover)] focus-visible:bg-[var(--bg-hover)]',
    d ? 'text-[var(--danger)]' : 'text-[var(--fg)]'
  )

  return (
    <div className={cn('relative', className)}>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true) } }}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-hover)]"
      >
        <MoreHorizontal aria-hidden className="w-5 h-5" />
      </button>
      {open && (
        <div
          ref={listRef}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          className="absolute right-0 top-full mt-1 z-50 min-w-[200px] p-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-xl animate-fade-in"
        >
          {visible.map((item) => {
            const Icon = item.icon
            const content = (<>{Icon && <Icon className="w-4 h-4 shrink-0" />}{item.label}</>)
            return item.href ? (
              <Link key={item.label} href={item.href} role="menuitem" tabIndex={-1} className={itemClass(item.destructive)} onClick={() => setOpen(false)}>
                {content}
              </Link>
            ) : (
              <button key={item.label} type="button" role="menuitem" tabIndex={-1} className={itemClass(item.destructive)} onClick={() => { setOpen(false); item.onSelect?.() }}>
                {content}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
