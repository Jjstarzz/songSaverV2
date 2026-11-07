'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSupabase } from './useSupabase'
import { useAuth } from './useAuth'
import { SongWithLanguages, SongWithLyrics } from '@/types/database'
import { getAllOfflineSongs, getOfflineSong } from '@/lib/offlineDB'
import { batchFetchCreatorNames } from './useCreatorName'
import { getCached, setCached, onCacheClear } from '@/lib/listCache'

const SONGS_KEY = 'songs'

// Share one in-flight request between components that mount at the same time
// (e.g. the dashboard and a setlist picker both asking for the song list).
let inflight: Promise<{ data: any[] | null; error: unknown }> | null = null
function loadSongs(supabase: ReturnType<typeof useSupabase>) {
  inflight ??= (async () => {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*, song_lyrics(language, is_default), service_songs(services(date))')
        .order('updated_at', { ascending: false })
      if (error || !data) return { data: null, error }
      const nameMap = await batchFetchCreatorNames(supabase, data.map((s: any) => s.created_by))
      return { data: data.map((s: any) => ({ ...s, creator_name: nameMap[s.created_by] ?? null })), error: null }
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export function useSongs() {
  const supabase = useSupabase()
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id
  // Start from the cached list so navigating between pages is instant;
  // a fresh copy is fetched in the background.
  const [songs, setSongsState] = useState<SongWithLanguages[]>(() => getCached<SongWithLanguages[]>(SONGS_KEY) ?? [])
  const [loading, setLoading] = useState(() => getCached(SONGS_KEY) === undefined)
  const [error, setError] = useState<string | null>(null)

  const setSongs = useCallback((next: SongWithLanguages[] | ((prev: SongWithLanguages[]) => SongWithLanguages[])) => {
    setSongsState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      setCached(SONGS_KEY, value)
      return value
    })
  }, [])

  useEffect(() => onCacheClear(() => { setSongsState([]); setLoading(true) }), [])

  const fetchSongs = useCallback(async () => {
    // Only show the loading state when there's nothing to show yet
    if (getCached(SONGS_KEY) === undefined) setLoading(true)
    setError(null)

    // If offline, load from IndexedDB immediately — no network needed
    if (!navigator.onLine) {
      const offline = await getAllOfflineSongs()
      setSongs(offline as unknown as SongWithLanguages[])
      setLoading(false)
      return
    }

    if (!userId) {
      if (!authLoading) setLoading(false) // no session at all — nothing to load
      return
    }

    const { data, error: err } = await loadSongs(supabase)

    if (err) {
      // Network failed mid-request — fall back to offline cache
      const offline = await getAllOfflineSongs()
      setSongs(offline as unknown as SongWithLanguages[])
    } else {
      const list = (data ?? []) as any[]
      setSongs(list.map((s) => {
        const dates: string[] = (s.service_songs ?? [])
          .map((ss: any) => ss.services?.date)
          .filter(Boolean)
        const last_sung_date = dates.length > 0 ? dates.sort().at(-1) : null
        return { ...s, last_sung_date }
      }) as unknown as SongWithLanguages[])
    }
    setLoading(false)
  }, [supabase, userId, authLoading, setSongs])

  useEffect(() => {
    fetchSongs()
  }, [fetchSongs])

  const deleteSong = useCallback(async (id: string) => {
    // Optimistic
    setSongs((prev) => prev.filter((s) => s.id !== id))
    const { error: err } = await supabase.from('songs').delete().eq('id', id)
    if (err) {
      fetchSongs() // Rollback
      return { error: err.message }
    }
    return { error: null }
  }, [supabase, fetchSongs, setSongs])

  return { songs, loading, error, refetch: fetchSongs, deleteSong }
}

export function useSong(id: string) {
  const supabase = useSupabase()
  const [song, setSong] = useState<SongWithLyrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSong = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('songs')
      .select('*, song_lyrics(*)')
      .eq('id', id)
      .single()

    if (err) {
      // Fallback to offline cache
      if (!navigator.onLine) {
        const offline = await getOfflineSong(id)
        if (offline) setSong(offline as unknown as SongWithLyrics)
        else setError('Song not available offline')
      } else {
        setError(err.message)
      }
    } else {
      setSong(data as unknown as SongWithLyrics)
    }
    setLoading(false)
  }, [supabase, id])

  useEffect(() => {
    if (id) fetchSong()
  }, [fetchSong, id])

  return { song, loading, error, refetch: fetchSong }
}
