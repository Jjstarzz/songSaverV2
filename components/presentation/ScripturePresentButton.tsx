'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, Monitor } from 'lucide-react'

function Trigger({ onClick, loading }: { onClick?: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="shrink-0 inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-sm font-semibold bg-accent-600 hover:bg-accent-700 text-white transition-colors disabled:opacity-70"
    >
      {loading ? <Loader2 aria-hidden className="w-4 h-4 animate-spin" /> : <Monitor aria-hidden className="w-4 h-4" />}
      Present
    </button>
  )
}

// The scripture presenter is only downloaded when someone presses Present.
const ScriptureController = dynamic(
  () => import('./ScriptureController').then((m) => m.ScriptureController),
  { ssr: false, loading: () => <Trigger loading /> },
)

export function ScripturePresentButton() {
  const [active, setActive] = useState(false)
  if (!active) return <Trigger onClick={() => setActive(true)} />
  return <ScriptureController defaultOpen onClose={() => setActive(false)} />
}
