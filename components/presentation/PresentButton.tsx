'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

type ControllerProps = React.ComponentProps<typeof import('./PresentationController').PresentationController>

// The presenter (≈1,300 lines + QR code + Realtime) is only downloaded when someone presses Present.
const PresentationController = dynamic(
  () => import('./PresentationController').then((m) => m.PresentationController),
  { ssr: false, loading: () => <PresentTrigger loading /> },
)

function PresentTrigger({ onClick, loading, label = 'Present', className }: { onClick?: () => void; loading?: boolean; label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        'shrink-0 inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-sm font-semibold bg-accent-600 hover:bg-accent-700 text-white transition-colors disabled:opacity-70',
        className
      )}
    >
      {loading ? <Loader2 aria-hidden className="w-4 h-4 animate-spin" /> : <Monitor aria-hidden className="w-4 h-4" />}
      {label}
    </button>
  )
}

/** "Present" button that lazy-loads the presentation controller on first use. */
export function PresentButton({ className, label, ...props }: Omit<ControllerProps, 'defaultOpen' | 'onClose'> & { className?: string; label?: string }) {
  const [active, setActive] = useState(false)
  if (!active) {
    return (
      <PresentTrigger
        label={label}
        className={className}
        onClick={() => setActive(true)}
      />
    )
  }
  return <PresentationController {...props} defaultOpen onClose={() => setActive(false)} />
}
