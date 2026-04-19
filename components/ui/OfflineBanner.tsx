'use client'

import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { usePathname } from 'next/navigation'

export function OfflineBanner() {
  const online = useOnlineStatus()
  const pathname = usePathname()

  // Don't show on public/embed pages
  if (pathname.endsWith('/view') || pathname === '/present') return null
  if (online) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[90] flex items-center justify-center gap-2 py-2 px-4 bg-amber-500/95 backdrop-blur-sm text-black text-xs font-medium"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      You&apos;re offline — showing saved songs only
    </div>
  )
}
