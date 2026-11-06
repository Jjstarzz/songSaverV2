import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Public endpoint — returns a service's data only when is_public = true.
// Uses the anon key so RLS applies; public services are readable by everyone.
// Created lazily so `next build` doesn't need Supabase env vars present.
let supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  supabase ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return supabase
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params

  const { data, error } = await getSupabase()
    .from('services')
    .select(`
      id, date, type, theme, notes, status, is_public,
      service_songs (
        id, order_index, key_override, notes,
        songs (
          id, title, artist, default_key, preferred_key, mode,
          song_lyrics ( id, language, lyrics, is_default )
        )
      )
    `)
    .eq('id', id)
    .eq('is_public', true)
    .order('order_index', { referencedTable: 'service_songs', ascending: true })
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Service not found or not public' }, { status: 404 })
  }

  return NextResponse.json(data)
}
