'use client'

import { Plus, WifiOff, Camera, CircleCheck, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { SongList } from '@/components/songs/SongList'
import { buttonVariants } from '@/components/ui/Button'
import { useSongs } from '@/hooks/useSongs'
import { useUserSongKeys } from '@/hooks/useUserSongKeys'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useAuth } from '@/hooks/useAuth'

function relativeTime(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * One library list for online and offline use. useSongs() already falls back
 * to the on-device copy when offline, so there is no separate "saved offline"
 * list (it used to repeat the whole library underneath).
 */
export function SongsClient() {
  const { songs, loading, error } = useSongs()
  const userKeys = useUserSongKeys()
  const online = useOnlineStatus()
  const { syncing, lastSynced } = useOfflineSync()
  const { user, loading: authLoading } = useAuth()
  // Online but no session (e.g. sign-in was refused): say so instead of showing an empty library
  const noSession = online && !authLoading && !user

  return (
    <div className="px-4">
      <PageHeader
        title="Songs"
        action={
          <>
            <Link href="/songs/import-photo" aria-label="Add a song from a photo" className={buttonVariants({ variant: 'secondary', size: 'icon' })}>
              <Camera aria-hidden className="w-4 h-4" />
            </Link>
            <Link href="/songs/new" className={buttonVariants({})}>
              <Plus aria-hidden className="w-4 h-4" />
              Add song
            </Link>
          </>
        }
      />

      {/* Offline / sync status */}
      <p className="-mt-2 mb-3 flex items-center gap-1.5 text-xs text-[var(--fg-subtle)]" role="status">
        {!online ? (
          <><WifiOff aria-hidden className="w-3.5 h-3.5 text-[var(--warning)]" /> Offline — showing songs saved on this device</>
        ) : syncing ? (
          <><RefreshCw aria-hidden className="w-3.5 h-3.5 animate-spin" /> Saving songs for offline use…</>
        ) : lastSynced ? (
          <><CircleCheck aria-hidden className="w-3.5 h-3.5 text-[var(--success)]" /> Available offline · updated {relativeTime(lastSynced)}</>
        ) : null}
      </p>

      {noSession && (
        <div role="alert" className="surface p-4 mb-3">
          <p className="text-sm font-medium text-[var(--fg)]">Couldn&apos;t connect to your library</p>
          <p className="text-sm text-[var(--fg-muted)] mt-1">SongSaver couldn&apos;t start a session. Check your connection and try again.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-3 h-10 px-4 rounded-xl border border-[var(--border-strong)] text-sm font-medium text-[var(--fg)]">
            Try again
          </button>
        </div>
      )}

      {error && online && (
        <p role="alert" className="surface p-3 mb-3 text-sm text-[var(--danger)]">Couldn&apos;t load songs: {error}</p>
      )}

      {!noSession && <SongList songs={songs} loading={loading} userKeys={userKeys} />}
    </div>
  )
}
