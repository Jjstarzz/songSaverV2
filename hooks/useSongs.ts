'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSupabase } from './useSupabase'
import { useAuth } from './useAuth'
import { SongWithLanguages, SongWithLyrics } from '@/types/database'
import { getAllOfflineSongs, getOfflineSong } from '@/lib/offlineDB'

export function useSongs() {
  const supabase = useSupabase()
  const { user } = useAuth()
  const [songs, setSongs] = useState<SongWithLanguages[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSongs = useCallback(async () => {
    setLoading(true)
    setError(null)

    // If offline, load from IndexedDB immediately — no network needed
    if (!navigator.onLine) {
      const offline = await getAllOfflineSongs()
      setSongs(offline as unknown as SongWithLanguages[])
      setLoading(false)
      return
    }

    if (!user) { setLoading(false); return }

    const { data, error: err } = await supabase
      .from('songs')
      .select('*, song_lyrics(language, is_default)')
      .order('updated_at', { ascending: false })

    if (err) {
      // Network failed mid-request — fall back to offline cache
      const offline = await getAllOfflineSongs()
      setSongs(offline as unknown as SongWithLanguages[])
    } else {
      setSongs((data ?? []) as unknown as SongWithLanguages[])
    }
    setLoading(false)
  }, [supabase, user])

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
  }, [supabase, fetchSongs])

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
