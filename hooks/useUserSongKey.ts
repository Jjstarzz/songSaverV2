'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import { useAuth } from './useAuth'

export function useUserSongKey(songId: string) {
  const supabase = useSupabase()
  const { user } = useAuth()
  const [userKey, setUserKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !songId) { setLoading(false); return }
    supabase
      .from('user_song_preferences')
      .select('preferred_key')
      .eq('user_id', user.id)
      .eq('song_id', songId)
      .maybeSingle()
      .then(({ data }) => {
        setUserKey(data?.preferred_key ?? null)
        setLoading(false)
      })
  }, [user, songId, supabase])

  const setKey = useCallback(async (key: string | null) => {
    if (!user) return null
    const { error } = await supabase
      .from('user_song_preferences')
      .upsert(
        { user_id: user.id, song_id: songId, preferred_key: key },
        { onConflict: 'user_id,song_id' }
      )
    if (!error) setUserKey(key)
    return error
  }, [user, songId, supabase])

  return { userKey, loading, setKey }
}
