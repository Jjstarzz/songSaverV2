'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSupabase } from './useSupabase'
import { useAuth } from './useAuth'
import { Service, ServiceWithSongs } from '@/types/database'
import { batchFetchCreatorNames } from './useCreatorName'
import { getCached, setCached, onCacheClear } from '@/lib/listCache'

const SERVICES_KEY = 'services'

export interface ServiceWithPreview extends Service {
  service_songs: { id: string; order_index: number; songs: { title: string; artist: string | null } }[]
  creator_name?: string | null
}

export function useServices() {
  const supabase = useSupabase()
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id
  const [services, setServices] = useState<ServiceWithPreview[]>(() => getCached<ServiceWithPreview[]>(SERVICES_KEY) ?? [])
  const [loading, setLoading] = useState(() => getCached(SERVICES_KEY) === undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => onCacheClear(() => { setServices([]); setLoading(true) }), [])

  const fetchServices = useCallback(async () => {
    if (!userId) {
      if (!authLoading) setLoading(false)
      return
    }
    if (getCached(SERVICES_KEY) === undefined) setLoading(true)
    // RLS returns own services + public services from others
    const { data, error: err } = await supabase
      .from('services')
      .select('*, service_songs(id, order_index, songs(title, artist))')
      .order('date', { ascending: false })

    if (err) { setError(err.message); setLoading(false); return }

    const list = (data ?? []) as any[]
    // Batch-fetch creator display names
    const nameMap = await batchFetchCreatorNames(supabase, list.map((s) => s.created_by))
    const next = list.map((s) => ({ ...s, creator_name: nameMap[s.created_by] ?? null })) as unknown as ServiceWithPreview[]
    setCached(SERVICES_KEY, next)
    setServices(next)
    setLoading(false)
  }, [supabase, userId, authLoading])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  return { services, loading, error, refetch: fetchServices }
}

export function useService(id: string) {
  const supabase = useSupabase()
  const [service, setService] = useState<ServiceWithSongs | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchService = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('services')
      .select('*, service_songs(*, songs(*, song_lyrics(id, language, lyrics, is_default)))')
      .eq('id', id)
      .order('order_index', { referencedTable: 'service_songs', ascending: true })
      .single()

    if (!error) setService(data as unknown as ServiceWithSongs)
    setLoading(false)
  }, [supabase, id])

  useEffect(() => {
    if (id) fetchService()
  }, [fetchService, id])

  return { service, loading, refetch: fetchService }
}
