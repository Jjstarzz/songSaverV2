'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSupabase } from './useSupabase'
import { useAuth } from './useAuth'
import { SongWithLanguages, SongWithLyrics } from '@/types/database'

export function useSongs() {
  const supabase = useSupabase()
  const { user } = useAuth()
  const [songs, setSongs] = useState<SongWithLanguages[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSongs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('songs')
      .select('*, song_lyrics(language, is_default)')
      .order('updated_at', { ascending: false })

    if (err) {
      setError(err.message)
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
      setError(err.message)
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
