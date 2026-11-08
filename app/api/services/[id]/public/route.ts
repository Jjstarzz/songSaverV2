import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Public endpoint — returns a service's data only when is_public = true.
//
// The database's read rule for public services only covers signed-in users,
// so an anonymous request (which is what this server-side route makes) can't
// see them and every shared link showed "not available". When the server-only
// service key is configured we read with it instead; the query below still
// filters on is_public = true and returns only the fields the public page needs.
// Without that key it falls back to the anon key (works once the database
// allows anonymous reads of public services — see supabase/public_service_read.sql).
// Created lazily so `next build` doesn't need Supabase env vars present.
let supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  supabase ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  return supabase
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Service not found or not public' }, { status: 404 })
  }

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
