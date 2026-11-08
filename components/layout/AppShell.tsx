'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Music2, CalendarDays, BookOpen, Gauge, Mic2, Settings2, MoreHorizontal, ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn, recordNavigation } from '@/lib/utils'

interface NavItem { href: string; label: string; icon: LucideIcon; description?: string }

/** The four main destinations — always visible on phones */
const PRIMARY: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/songs', label: 'Songs', icon: Music2 },
  { href: '/services', label: 'Services', icon: CalendarDays },
  { href: '/bible', label: 'Scripture', icon: BookOpen },
]

/** Under "More" on phones; listed in the sidebar on desktop */
const SECONDARY: NavItem[] = [
  { href: '/tools', label: 'Tools', icon: Gauge, description: 'Key reference, tap tempo, metronome' },
  { href: '/rehearsal', label: 'Rehearsal', icon: Mic2, description: 'Record and play back practice' },
  { href: '/settings', label: 'Settings', icon: Settings2, description: 'Account, appearance, team, data' },
]

/** Full-screen pages that bring their own chrome (projector, stage, public view, print) */
function isChromeless(pathname: string) {
  return pathname === '/present' || pathname === '/stage' || /^\/services\/[^/]+\/(view|print)$/.test(pathname)
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  if (href === '/settings') return pathname.startsWith('/settings') || pathname.startsWith('/profile') || pathname === '/import'
  return pathname === href || pathname.startsWith(href + '/')
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/'
  const [moreOpen, setMoreOpen] = useState(false)
  const lastPath = useRef<string | null>(null)
  useEffect(() => {
    setMoreOpen(false)
    // Count real in-app page changes so Back buttons know whether there's a page to return to
    // (compare paths rather than counting effect runs — effects can run twice on mount)
    if (lastPath.current !== null && lastPath.current !== pathname) recordNavigation()
    lastPath.current = pathname
  }, [pathname])

  if (isChromeless(pathname)) {
    return <div id="app-shell" className="min-h-dvh">{children}</div>
  }

  const moreActive = SECONDARY.some((i) => isActive(pathname, i.href))

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-accent-600 focus:text-white focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-[var(--border)] bg-[var(--bg-surface)]"
        aria-label="Main"
      >
        <Link href="/" className="flex items-center gap-2.5 px-5 h-16 shrink-0">
          <span aria-hidden className="w-8 h-8 rounded-lg bg-accent-600 flex items-center justify-center">
            <Music2 className="w-4 h-4 text-white" />
          </span>
          <span className="text-[15px] font-semibold text-[var(--fg)]">SongSaver</span>
        </Link>
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {PRIMARY.map((item) => <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />)}
          <p className="px-3 pt-5 pb-1.5 section-label">More</p>
          {SECONDARY.map((item) => <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />)}
        </nav>
      </aside>

      <div id="app-shell" className="min-h-dvh lg:pl-60">
        <main id="main" tabIndex={-1} className="pb-nav mx-auto w-full max-w-[1200px] lg:px-4 outline-none">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav lg:hidden" aria-label="Main">
        <ul className="flex items-stretch max-w-xl mx-auto" style={{ height: 'var(--nav-h)' }}>
          {PRIMARY.map((item) => (
            <li key={item.href} className="flex-1">
              <TabLink item={item} active={isActive(pathname, item.href)} />
            </li>
          ))}
          <li className="flex-1">
            <button
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                'w-full h-full flex flex-col items-center justify-center gap-1 text-[11px] font-medium',
                moreActive ? 'text-[var(--accent-fg)]' : 'text-[var(--fg-subtle)]'
              )}
            >
              <MoreHorizontal className="w-5 h-5" aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More" variant="sheet">
        <ul className="-mx-2 -my-1">
          {SECONDARY.map((item) => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-2 py-3 rounded-xl min-h-[56px]',
                    active ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg-hover)]'
                  )}
                >
                  <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[var(--border)]', active ? 'text-[var(--accent-fg)]' : 'text-[var(--fg-muted)]')}>
                    <Icon className="w-5 h-5" aria-hidden />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-[var(--fg)]">{item.label}</span>
                    {item.description && <span className="block text-xs text-[var(--fg-subtle)]">{item.description}</span>}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--fg-subtle)]" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      </Modal>
    </>
  )
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-colors',
        active ? 'bg-[var(--accent-soft)] text-[var(--accent-fg)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-hover)]'
      )}
    >
      <Icon className="w-[18px] h-[18px]" aria-hidden />
      {item.label}
    </Link>
  )
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'h-full flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors relative',
        active ? 'text-[var(--accent-fg)]' : 'text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]'
      )}
    >
      {active && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-accent-500" />}
      <Icon className="w-5 h-5" aria-hidden />
      {item.label}
    </Link>
  )
}
