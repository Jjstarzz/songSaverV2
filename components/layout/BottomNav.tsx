'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Music2, CalendarDays, Mic2, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/',          label: 'Home',      icon: Home,        exact: true },
  { href: '/songs',     label: 'Songs',     icon: Music2 },
  { href: '/services',  label: 'Services',  icon: CalendarDays },
  { href: '/rehearsal', label: 'Rehearsal', icon: Mic2 },
  { href: '/settings',  label: 'Settings',  icon: Settings2 },
]

export function BottomNav() {
  const pathname = usePathname()

  // Hide nav on public/embed pages that shouldn't show app chrome
  if (pathname.endsWith('/view') || pathname === '/present') return null

  return (
    <nav className="bottom-nav bg-[var(--bg-surface)]/90 backdrop-blur-xl border-t border-[var(--border)]">
      <div className="flex items-stretch max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          // /settings also covers /profile for backwards compat
          const active = exact
            ? pathname === href
            : pathname.startsWith(href) || (href === '/settings' && pathname.startsWith('/profile'))

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-3 px-1',
                'transition-all duration-200 relative select-none',
                'active:scale-95',
                active ? 'text-accent-400' : 'text-white/40 hover:text-white/70'
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-accent-500" />
              )}
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
