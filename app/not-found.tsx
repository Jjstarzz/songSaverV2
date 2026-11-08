import Link from 'next/link'
import { Music2 } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70dvh] gap-4 px-6 text-center">
      <Music2 strokeWidth={1.5} className="w-8 h-8 text-[var(--fg-subtle)]" />
      <div>
        <h1 className="text-lg font-semibold text-[var(--fg)]">Page not found</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">This link doesn&apos;t lead anywhere — it may be old or mistyped.</p>
      </div>
      <div className="flex gap-2">
        <Link href="/" className="px-4 py-2.5 rounded-xl bg-accent-600 text-white text-sm font-medium">Go home</Link>
        <Link href="/songs" className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--fg)] text-sm font-medium">Browse songs</Link>
      </div>
    </div>
  )
}
