'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'songsaver_recently_viewed'
const MAX_ITEMS = 10

export interface RecentlyViewedItem {
  id: string
  title: string
  artist?: string | null
  viewedAt: number
}

function load(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as RecentlyViewedItem[]) : []
  } catch {
    return []
  }
}

function save(items: RecentlyViewedItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([])

  useEffect(() => {
    setItems(load())
  }, [])

  const track = useCallback((song: { id: string; title: string; artist?: string | null }) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== song.id)
      const next = [
        { id: song.id, title: song.title, artist: song.artist, viewedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_ITEMS)
      save(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setItems([])
  }, [])

  return { items, track, clear }
}
