'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Music2, CalendarDays, Settings2, BookOpen, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/',         label: 'Home',      icon: Home,        exact: true },
  { href: '/songs',    label: 'Songs',     icon: Music2 },
  { href: '/services', label: 'Services',  icon: CalendarDays },
  { href: '/tools',    label: 'Tools',     icon: Gauge },
  { href: '/bible',    label: 'Scripture', icon: BookOpen },
  { href: '/settings', label: 'Settings',  icon: Settings2 },
]

export function BottomNav() {
  const pathname = usePathname()

  // Hide nav on public/embed pages that shouldn't show app chrome
  if (pathname.endsWith('/view') || pathname === '/present') return null

  return (
    <nav className="bottom-nav bg-[var(--bg)]/88 backdrop-blur-2xl">
      <div className="flex items-stretch max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname.startsWith(href) || (href === '/settings' && pathname.startsWith('/profile'))

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-0.5',
                'transition-all duration-200 relative select-none',
                'active:scale-95',
                active ? 'text-accent-400' : 'text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]'
              )}
            >
              {active && (
                <span className="absolute inset-x-1 top-1.5 bottom-1.5 rounded-2xl bg-accent-500/[0.13] border border-accent-500/25" />
              )}
              <Icon className="w-[18px] h-[18px] relative z-10" />
              <span className="relative z-10 text-[9px] font-semibold leading-none tracking-wide">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
