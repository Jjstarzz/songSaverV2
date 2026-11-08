'use client'

import { useEffect, useRef, useState } from 'react'
import { useSupabase } from './useSupabase'
import { useAuth } from './useAuth'
import { saveOfflineSongs } from '@/lib/offlineDB'

/**
 * Silently syncs all songs (with full lyrics) to IndexedDB whenever
 * the user is online. Runs once per session, in the background.
 */
const LAST_SYNC_KEY = 'songsaver-offline-synced-at'
const MIN_INTERVAL_MS = 60 * 60 * 1000 // re-download the full library at most hourly
let syncedThisSession = false            // module-level: survives page navigations

function readLastSync(): Date | null {
  try {
    const v = localStorage.getItem(LAST_SYNC_KEY)
    return v ? new Date(Number(v)) : null
  } catch { return null }
}

export function useOfflineSync() {
  const supabase = useSupabase()
  const { user } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const hasSynced = useRef(false)
  useEffect(() => { setLastSynced(readLastSync()) }, [])

  const sync = async () => {
    if (!user || !navigator.onLine || syncing) return
    setSyncing(true)

    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*, song_lyrics(*)')
        .order('updated_at', { ascending: false })

      if (error || !data) return

      await saveOfflineSongs(
        data.map((song: any) => ({
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
        }))
      )

      const now = new Date()
      setLastSynced(now)
      try { localStorage.setItem(LAST_SYNC_KEY, String(now.getTime())) } catch { /* ignore */ }
    } catch {
      // Silent failure — offline sync is best-effort
    } finally {
      setSyncing(false)
    }
  }

  // Auto-sync once per browser session (and only if the copy is over an hour old).
  // Previously this re-downloaded every song with full lyrics on each visit to Songs.
  useEffect(() => {
    if (!user || hasSynced.current || syncedThisSession) return
    hasSynced.current = true
    syncedThisSession = true
    const last = readLastSync()
    if (last && Date.now() - last.getTime() < MIN_INTERVAL_MS) return
    sync()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  return { sync, syncing, lastSynced }
}
