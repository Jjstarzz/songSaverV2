import { Database } from 'lucide-react'
import { MIGRATION_HINT } from '@/lib/features'

/** Shown in place of a feature whose database tables haven't been created yet. */
export function FeatureNotice({ feature }: { feature: string }) {
  return (
    <div role="note" className="rounded-xl border border-dashed border-[var(--border-strong)] p-3 text-sm text-[var(--fg-muted)] flex gap-2">
      <Database aria-hidden className="w-4 h-4 mt-0.5 shrink-0 text-[var(--fg-subtle)]" />
      <span><span className="font-medium text-[var(--fg)]">{feature}</span> isn&apos;t switched on yet. {MIGRATION_HINT}</span>
    </div>
  )
}
