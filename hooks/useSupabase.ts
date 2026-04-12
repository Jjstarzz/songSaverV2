'use client'

import { useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton browser client — avoids creating multiple instances
let browserClient: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // During SSR — return a temporary stub that never makes real requests
    // All actual Supabase calls are inside useEffect which only runs client-side
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.placeholder'
    )
  }
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return browserClient
}

export function useSupabase(): SupabaseClient {
  const ref = useRef<SupabaseClient | null>(null)
  if (!ref.current) {
    ref.current = getClient()
  }
  return ref.current
}
