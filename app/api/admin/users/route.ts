import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/** Server-side admin client — uses service role key, never sent to the browser */
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** Verify the requesting user is the owner. Returns their user ID or null. */
async function verifyOwner(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null

  // Use anon key + caller's JWT to read their own profile row
  const caller = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user } } = await caller.auth.getUser()
  if (!user) return null

  const { data } = await caller
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (data as { role?: string } | null)?.role === 'owner' ? user.id : null
}

/** GET /api/admin/users — list all users */
export async function GET(req: NextRequest) {
  const callerId = await verifyOwner(req)
  if (!callerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = adminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch display names from profiles (admin client bypasses RLS — no need to filter by id)
  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, display_name, role')
  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p: { id: string; display_name: string | null; role: string }) => [p.id, p])
  )

  const users = data.users.map(u => ({
    id: u.id,
    email: u.email ?? null,
    display_name: (profileMap[u.id] as { display_name?: string | null })?.display_name ?? null,
    role: (profileMap[u.id] as { role?: string })?.role ?? 'user',
    is_anonymous: u.is_anonymous ?? false,
    created_at: u.created_at,
  }))

  return NextResponse.json({ users })
}

/** PATCH /api/admin/users — update a user's role */
export async function PATCH(req: NextRequest) {
  const callerId = await verifyOwner(req)
  if (!callerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, role } = await req.json()
  if (!id || !role) return NextResponse.json({ error: 'Missing id or role' }, { status: 400 })
  if (!['admin', 'user'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  if (id === callerId) return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })

  const admin = adminClient()
  const { error } = await admin.from('profiles').update({ role }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

/** DELETE /api/admin/users?id=<userId> — remove a user entirely */
export async function DELETE(req: NextRequest) {
  const callerId = await verifyOwner(req)
  if (!callerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const targetId = searchParams.get('id')
  if (!targetId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (targetId === callerId) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

  const admin = adminClient()
  const { error } = await admin.auth.admin.deleteUser(targetId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
