'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from './useSupabase'

/**
 * Fetches the display name for a single user ID.
 * Used on detail pages where we already have the created_by field.
 */
export function useCreatorName(userId: string | null | undefined) {
  const supabase = useSupabase()
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => setName(data?.display_name ?? null))
  }, [userId, supabase])

  return name
}

/**
 * Batch-fetches display names for an array of user IDs.
 * Returns a map of userId → displayName.
 */
export async function batchFetchCreatorNames(
  supabase: ReturnType<typeof useSupabase>,
  userIds: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))]
  if (!unique.length) return {}

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', unique)

  return Object.fromEntries(
    (data ?? []).map((p: any) => [p.id, p.display_name ?? 'Unknown'])
  )
}
