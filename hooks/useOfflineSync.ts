'use client'

import { useEffect, useRef, useState } from 'react'
import { useSupabase } from './useSupabase'
import { useAuth } from './useAuth'
import { saveOfflineSong } from '@/lib/offlineDB'

/**
 * Silently syncs all songs (with full lyrics) to IndexedDB whenever
 * the user is online. Runs once per session, in the background.
 */
export function useOfflineSync() {
  const supabase = useSupabase()
  const { user } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const hasSynced = useRef(false)

  const sync = async () => {
    if (!user || !navigator.onLine || syncing) return
    setSyncing(true)

    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*, song_lyrics(*)')
        .order('updated_at', { ascending: false })

      if (error || !data) return

      await Promise.allSettled(
        data.map((song: any) =>
          saveOfflineSong({
            id: song.id,
            title: song.title,
            artist: song.artist ?? null,
            default_key: song.default_key ?? null,
            preferred_key: song.preferred_key ?? null,
            mode: song.mode ?? null,
            bpm: song.bpm ?? null,
            time_signature: song.time_signature ?? null,
            tags: song.tags ?? [],
            notes: song.notes ?? null,
            youtube_url: song.youtube_url ?? null,
            spotify_url: song.spotify_url ?? null,
            created_at: song.created_at,
            created_by: song.created_by,
            song_lyrics: (song.song_lyrics ?? []).map((l: any) => ({
              id: l.id,
              language: l.language,
              lyrics: l.lyrics,
              is_default: l.is_default,
            })),
          })
        )
      )

      setLastSynced(new Date())
    } catch {
      // Silent failure — offline sync is best-effort
    } finally {
      setSyncing(false)
    }
  }

  // Auto-sync once per session when user is available
  useEffect(() => {
    if (!user || hasSynced.current) return
    hasSynced.current = true
    sync()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  return { sync, syncing, lastSynced }
}
