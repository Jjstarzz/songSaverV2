'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from './useSupabase'
import { useAuth } from './useAuth'

/** Fetches all per-user key preferences in one query. Returns a map of song_id → preferred_key. */
export function useUserSongKeys(): Record<string, string> {
  const supabase = useSupabase()
  const { user } = useAuth()
  const [keyMap, setKeyMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) return
    supabase
      .from('user_song_preferences')
      .select('song_id, preferred_key')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        data?.forEach((p) => {
          if (p.preferred_key) map[p.song_id] = p.preferred_key
        })
        setKeyMap(map)
      })
  }, [user, supabase])

  return keyMap
}
