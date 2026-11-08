'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSupabase } from './useSupabase'
import { useAuth } from './useAuth'
import { isMissingTable } from '@/lib/features'

interface Options {
  /** Column/value equality filters, e.g. { service_id: id } */
  eq?: Record<string, string | null | undefined>
  /** Column/values IN filter */
  in?: [string, string[]]
  order?: [string, { ascending: boolean }]
  select?: string
  /** Skip the query (e.g. while an id isn't known yet) */
  skip?: boolean
}

/**
 * Reads rows from one of the newer feature tables. `missing` is true when the
 * table hasn't been created yet (migration not applied), so the UI can show a
 * notice rather than an error.
 */
export function useFeatureTable<T>(table: string, opts: Options = {}) {
  const supabase = useSupabase()
  const { user } = useAuth()
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const key = JSON.stringify(opts)

  const refetch = useCallback(async () => {
    if (opts.skip || !user) { setLoading(false); return }
    if (opts.in && opts.in[1].length === 0) { setRows([]); setLoading(false); return }
    setLoading(true)
    let q = supabase.from(table).select(opts.select ?? '*')
    for (const [col, val] of Object.entries(opts.eq ?? {})) if (val) q = q.eq(col, val)
    if (opts.in) q = q.in(opts.in[0], opts.in[1])
    if (opts.order) q = q.order(opts.order[0], opts.order[1])
    const { data, error: err } = await q
    if (err) {
      if (isMissingTable(err)) setMissing(true)
      else setError(err.message)
      setRows([])
    } else {
      setMissing(false)
      setError(null)
      setRows((data ?? []) as T[])
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, table, key, user?.id])

  useEffect(() => { refetch() }, [refetch])

  return { rows, loading, missing, error, refetch, setRows }
}
