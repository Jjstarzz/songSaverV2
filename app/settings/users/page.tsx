'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserRound, Trash2, Crown, ShieldAlert } from 'lucide-react'
import { BackHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useRole } from '@/hooks/useRole'
import { useSupabase } from '@/hooks/useSupabase'
import { toast } from '@/components/ui/Toaster'
import { cn } from '@/lib/utils'

interface AppUser {
  id: string
  email: string | null
  display_name: string | null
  role: string
  is_anonymous: boolean
  created_at: string
}

export default function UsersPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { isOwner, loading: roleLoading } = useRole()

  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [removeTarget, setRemoveTarget] = useState<AppUser | null>(null)
  const [removing, setRemoving] = useState(false)

  const fetchUsers = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) { toast.error('Failed to load users'); return }
    const { users: data } = await res.json()
    // Sort: owner first, then by join date
    setUsers((data as AppUser[]).sort((a, b) => {
      if (a.role === 'owner') return -1
      if (b.role === 'owner') return 1
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }))
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (roleLoading) return
    if (!isOwner) { router.replace('/settings'); return }
    fetchUsers()
  }, [isOwner, roleLoading, fetchUsers, router])

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { toast.error('Not authenticated'); setRemoving(false); return }

    const res = await fetch(`/api/admin/users?id=${removeTarget.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (!res.ok) {
      const { error } = await res.json()
      toast.error(error ?? 'Failed to remove user')
      setRemoving(false)
      return
    }

    toast.success(`${removeTarget.display_name ?? removeTarget.email ?? 'User'} removed`)
    setRemoveTarget(null)
    setRemoving(false)
    fetchUsers()
  }

  if (roleLoading || (loading && isOwner)) {
    return (
      <>
        <BackHeader title="Users">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </BackHeader>
        <div className="px-4 pt-6 space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </>
    )
  }

  const totalCount = users.length
  const anonCount = users.filter(u => u.is_anonymous).length

  return (
    <>
      <BackHeader title="Users">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </BackHeader>

      <div className="px-4 pt-6 pb-10 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-white">{totalCount}</p>
            <p className="text-xs text-white/40 mt-0.5">Total users</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-white">{totalCount - anonCount}</p>
            <p className="text-xs text-white/40 mt-0.5">Registered</p>
          </div>
        </div>

        {/* User list */}
        <div className="space-y-2">
          <p className="section-label">All Accounts</p>
          {users.map((u) => {
            const name = u.display_name || u.email || 'Anonymous user'
            const joined = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            const isOwnerRow = u.role === 'owner'

            return (
              <div
                key={u.id}
                className={cn(
                  'glass-card p-4 flex items-center gap-3',
                  isOwnerRow && 'border border-amber-500/20'
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  isOwnerRow ? 'bg-amber-500/15' : 'bg-white/[0.06]'
                )}>
                  {isOwnerRow
                    ? <Crown className="w-5 h-5 text-amber-400" />
                    : <UserRound className="w-5 h-5 text-white/30" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white truncate">{name}</p>
                    {isOwnerRow && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-semibold">
                        Owner
                      </span>
                    )}
                    {u.is_anonymous && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/40 border border-white/10">
                        Anonymous
                      </span>
                    )}
                  </div>
                  {u.email && u.display_name && (
                    <p className="text-xs text-white/40 truncate">{u.email}</p>
                  )}
                  <p className="text-[10px] text-white/25 mt-0.5">Joined {joined}</p>
                </div>

                {/* Remove button — not shown for owner */}
                {!isOwnerRow && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setRemoveTarget(u)}
                    title="Remove user"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {/* Warning note */}
        <div className="glass-card p-4 flex gap-3 border border-red-500/10">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-white/40 leading-relaxed">
            Removing a user permanently deletes their account and all data they&apos;ve added — songs, services, recordings. This cannot be undone.
          </p>
        </div>
      </div>

      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remove User"
        description={`Permanently remove ${removeTarget?.display_name ?? removeTarget?.email ?? 'this user'}? All their songs, services, and recordings will be deleted.`}
        loading={removing}
      />
    </>
  )
}
