'use client'

import { useDeferredValue, useMemo } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { useSongs } from '@/hooks/useSongs'
import { findSimilar } from '@/lib/songMatch'

/** Shown under the title on the New Song form: existing songs that look like the same song. */
export function DuplicateHint({ title }: { title: string }) {
  const { songs } = useSongs()
  const deferred = useDeferredValue(title)
  const matches = useMemo(() => findSimilar(deferred, songs), [deferred, songs])
  if (matches.length === 0) return null

  return (
    <div role="status" className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_45%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-3">
      <p className="flex items-center gap-2 text-sm font-medium text-[var(--fg)]">
        <AlertTriangle aria-hidden className="w-4 h-4 text-[var(--warning)]" />
        This might already be in your library
      </p>
      <ul className="mt-2 space-y-1">
        {matches.map((s) => (
          <li key={s.id}>
            <Link href={`/songs/${s.id}`} target="_blank" className="text-sm text-[var(--accent-fg)] hover:underline">
              {s.title}{s.artist ? ` — ${s.artist}` : ''}
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[var(--fg-muted)]">If it&apos;s a different song (or a new arrangement), carry on — nothing is blocked.</p>
    </div>
  )
}
