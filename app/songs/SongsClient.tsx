'use client'

import { Plus, WifiOff, BookmarkCheck } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { SongList } from '@/components/songs/SongList'
import { Button } from '@/components/ui/Button'
import { useSongs } from '@/hooks/useSongs'
import { useUserSongKeys } from '@/hooks/useUserSongKeys'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useOfflineSongs } from '@/hooks/useOfflineSong'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { cn } from '@/lib/utils'

export function SongsClient() {
  const { songs, loading } = useSongs()
  const userKeys = useUserSongKeys()
  const online = useOnlineStatus()
  const { songs: offlineSongs, loading: offlineLoading } = useOfflineSongs()
  useOfflineSync() // silently syncs all songs to IndexedDB in the background

  if (!online) {
    // Offline: show only saved songs
    return (
      <div className="px-4">
        <PageHeader
          title="Song Library"
          subtitle={offlineLoading ? '' : `${offlineSongs.length} saved offline`}
        />
        {!offlineLoading && offlineSongs.length === 0 ? (
          <div className="glass-card p-8 text-center space-y-3 mt-4">
            <WifiOff className="w-8 h-8 text-[var(--fg-subtle)] mx-auto" />
            <p className="text-sm text-[var(--fg-muted)]">No offline songs saved</p>
            <p className="text-xs text-[var(--fg-subtle)]">
              Go online and tap the bookmark icon on any song to save it for offline use.
            </p>
          </div>
        ) : (
          <SongList
            songs={offlineSongs as any}
            loading={offlineLoading}
            userKeys={userKeys}
          />
        )}
      </div>
    )
  }

  return (
    <div className="px-4">
      <PageHeader
        title="Song Library"
        subtitle={loading ? '' : `${songs.length} songs`}
        action={
          <Link href="/songs/new">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </Link>
        }
      />
      <SongList songs={songs} loading={loading} userKeys={userKeys} />

      {/* Offline-saved songs section */}
      {!offlineLoading && offlineSongs.length > 0 && (
        <div className="mt-8 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
            <p className="text-xs font-semibold text-[var(--fg-subtle)] uppercase tracking-widest">
              Saved offline ({offlineSongs.length})
            </p>
          </div>
          <div className="space-y-2">
            {offlineSongs.map((s) => (
              <Link key={s.id} href={`/songs/${s.id}`}>
                <div className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl',
                  'bg-[var(--bg-card)] border border-[var(--border)]',
                  'hover:bg-[var(--bg-card-hover)] transition-colors'
                )}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--fg)] truncate">{s.title}</p>
                    {s.artist && (
                      <p className="text-xs text-[var(--fg-subtle)] truncate">{s.artist}</p>
                    )}
                  </div>
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
