'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  saveOfflineSong,
  removeOfflineSong,
  isOfflineSaved,
  getAllOfflineSongs,
  OfflineSong,
} from '@/lib/offlineDB'
import { toast } from '@/components/ui/Toaster'
import type { SongWithLyrics } from '@/types/database'

/** Save / unsave a single song for offline use. */
export function useOfflineSong(song: SongWithLyrics | null) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!song) return
    isOfflineSaved(song.id).then(setSaved).catch(() => {})
  }, [song?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(async () => {
    if (!song) return
    setSaving(true)
    try {
      if (saved) {
        await removeOfflineSong(song.id)
        setSaved(false)
        toast.success('Removed from offline library')
      } else {
        await saveOfflineSong({
          id: song.id,
          title: song.title,
          artist: song.artist ?? null,
          default_key: song.default_key ?? null,
          preferred_key: song.preferred_key ?? null,
          mode: (song.mode ?? null) as 'major' | 'minor' | null,
          bpm: song.bpm ?? null,
          time_signature: song.time_signature ?? null,
          tags: song.tags ?? [],
          notes: song.notes ?? null,
          youtube_url: song.youtube_url ?? null,
          spotify_url: song.spotify_url ?? null,
          created_at: song.created_at,
          created_by: song.created_by,
          song_lyrics: (song.song_lyrics ?? []).map((l) => ({
            id: l.id,
            language: l.language,
            lyrics: l.lyrics,
            is_default: l.is_default,
          })),
        })
        setSaved(true)
        toast.success('Saved for offline use')
      }
    } catch {
      toast.error('Failed to update offline library')
    }
    setSaving(false)
  }, [song, saved])

  return { saved, saving, toggle }
}

/** Load all locally saved offline songs. */
export function useOfflineSongs() {
  const [songs, setSongs] = useState<OfflineSong[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllOfflineSongs()
      .then((data) => setSongs(data.sort((a, b) => b.savedAt - a.savedAt)))
      .catch(() => setSongs([]))
      .finally(() => setLoading(false))
  }, [])

  return { songs, loading }
}
