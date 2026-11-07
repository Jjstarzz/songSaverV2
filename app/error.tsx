'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

/**
 * Shown instead of a blank "Application error" screen if a page crashes.
 * "Try again" re-renders the page without a full reload, so things like an
 * open presentation in another window keep running.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70dvh] gap-4 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-[var(--fg)]">Something went wrong</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1 max-w-xs">
          This page hit an unexpected error. Your songs and services are safe.
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={reset} className="px-4 py-2.5 rounded-xl bg-accent-600 text-white text-sm font-medium">
          Try again
        </button>
        <Link href="/" className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--fg)] text-sm font-medium">
          Go home
        </Link>
      </div>
    </div>
  )
}
