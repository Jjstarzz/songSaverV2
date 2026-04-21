'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { useSupabase } from './useSupabase'

// Module-level cache so the role is fetched once per session, not on every render
let _cachedUserId: string | null = null
let _cachedRole: string | null = null

export function useRole() {
  const { user, loading: authLoading } = useAuth()
  const supabase = useSupabase()
  const [role, setRole] = useState<string | null>(
    user?.id === _cachedUserId ? _cachedRole : null
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setRole(null); setLoading(false); return }

    // Return cached result if the same user
    if (_cachedUserId === user.id && _cachedRole !== null) {
      setRole(_cachedRole)
      setLoading(false)
      return
    }

    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const r = (data as { role?: string } | null)?.role ?? 'user'
        _cachedUserId = user.id
        _cachedRole = r
        setRole(r)
        setLoading(false)
      })
  }, [user?.id, authLoading, supabase])

  return {
    role,
    isOwner: role === 'owner',
    loading: authLoading || loading,
  }
}
