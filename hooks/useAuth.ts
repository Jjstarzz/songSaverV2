'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useSupabase } from './useSupabase'
import { clearListCache } from '@/lib/listCache'

// Last user id seen in this tab — used to drop cached lists when it changes.
let lastUserId: string | null | undefined

export function useAuth() {
  const supabase = useSupabase()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // getSession() reads from localStorage — works offline.
    // getUser() hits the network to verify the JWT — fails offline.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const id = session?.user?.id ?? null
      if (lastUserId !== undefined && lastUserId !== id) clearListCache()
      lastUserId = id
      setUser((prev) => (prev?.id === id ? prev : session?.user ?? null))
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null
      if (lastUserId !== undefined && lastUserId !== id) clearListCache()
      lastUserId = id
      // Supabase emits a fresh User object on every auth event (token refresh,
      // tab focus…). Keep the previous object when it's the same user so hooks
      // that depend on `user` don't refetch for nothing.
      setUser((prev) => (prev?.id === id ? prev : session?.user ?? null))
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return { user, loading }
}
