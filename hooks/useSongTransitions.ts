'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import { useAuth } from './useAuth'
import { Song } from '@/types/database'

export interface TransitionItem {
  id: string
  from_song_id: string
  to_song_id: string
  notes: string | null
  created_by: string
  created_at: string
  /** The song on the other end of this transition (not the current song) */
  other_song: Song
}

export function useSongTransitions(songId: string) {
  const supabase = useSupabase()
  const { user } = useAuth()
  const [transitions, setTransitions] = useState<TransitionItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!songId) return
    setLoading(true)

    // Query both directions in one call — Option B (undirected relationship)
    const { data } = await supabase
      .from('song_transitions')
      .select(
        '*, from_song:from_song_id(id, title, artist, default_key, preferred_key, mode), to_song:to_song_id(id, title, artist, default_key, preferred_key, mode)'
      )
      .or(`from_song_id.eq.${songId},to_song_id.eq.${songId}`)
      .order('created_at', { ascending: true })

    const normalised = ((data ?? []) as unknown as {
      id: string
      from_song_id: string
      to_song_id: string
      notes: string | null
      created_by: string
      created_at: string
      from_song: Song
      to_song: Song
    }[]).map((t) => ({
      id: t.id,
      from_song_id: t.from_song_id,
      to_song_id: t.to_song_id,
      notes: t.notes,
      created_by: t.created_by,
      created_at: t.created_at,
      other_song: t.from_song_id === songId ? t.to_song : t.from_song,
    }))

    setTransitions(normalised)
    setLoading(false)
  }, [supabase, songId])

  useEffect(() => { fetch() }, [fetch])

  const addTransition = useCallback(async (otherSongId: string, notes?: string) => {
    if (!user) return { error: 'Not authenticated' }
    // Always store with current song as from_song_id — query handles both directions
    const { error } = await supabase.from('song_transitions').insert({
      from_song_id: songId,
      to_song_id: otherSongId,
      notes: notes?.trim() || null,
      created_by: user.id,
    })
    if (!error) await fetch()
    return { error: error?.message ?? null }
  }, [supabase, songId, user, fetch])

  const removeTransition = useCallback(async (transitionId: string) => {
    const { error } = await supabase
      .from('song_transitions')
      .delete()
      .eq('id', transitionId)
    if (!error) await fetch()
    return { error: error?.message ?? null }
  }, [supabase, fetch])

  return { transitions, loading, addTransition, removeTransition, refetch: fetch }
}
