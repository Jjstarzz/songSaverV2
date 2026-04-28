'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, CalendarDays, Globe, Lock, FileDown, Share2, Check, UserRound } from 'lucide-react'
import { BackHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { SetlistManager } from '@/components/services/SetlistManager'
import { ConfirmModal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useService, useServices } from '@/hooks/useServices'
import { useCreatorName } from '@/hooks/useCreatorName'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { useSupabase } from '@/hooks/useSupabase'
import { toast } from '@/components/ui/Toaster'
import { SERVICE_TYPES, SERVICE_STATUSES } from '@/types/database'
import { PresentationController } from '@/components/presentation/PresentationController'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props { id: string }

export function ServiceDetailClient({ id }: Props) {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useAuth()
  const { service, loading, refetch } = useService(id)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyPublicLink = async () => {
    const url = `${window.location.origin}/services/${id}/view`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const { isOwner: isAppOwner } = useRole()
  const isOwner = !!user && !!service && service.created_by === user.id
  const canEdit = isOwner
  const canDelete = isOwner || isAppOwner
  const creatorName = useCreatorName(service?.created_by)
  const isPast = !!service && service.date < new Date().toISOString().split('T')[0]

  const toggleVisibility = async () => {
    if (!service) return
    const { error } = await supabase
      .from('services')
      .update({ is_public: !service.is_public })
      .eq('id', id)
    if (error) { toast.error('Failed to update visibility'); return }
    toast.success(service.is_public ? 'Service set to private' : 'Service set to public')
    refetch()
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) { toast.error('Failed to delete service'); setDeleting(false); return }
    toast.success('Service deleted')
    router.push('/services')
  }

  if (loading) {
    return (
      <>
        <BackHeader title=""><div className="w-8 h-8" /></BackHeader>
        <div className="px-4 pt-6 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </>
    )
  }

  if (!service) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-white/50">Service not found</p></div>
  }

  const setlistItems = (service.service_songs ?? []) as any[]

  const servicePlaylist = setlistItems
    .filter((ss: any) => ss.songs)
    .map((ss: any) => {
      const songLyrics: { lyrics: string; is_default: boolean }[] = ss.songs.song_lyrics ?? []
      const defaultLyric = songLyrics.find((l) => l.is_default) ?? songLyrics[0]
      return { title: ss.songs.title as string, lyricsText: defaultLyric?.lyrics ?? '' }
    })
    .filter((item) => item.lyricsText)

  return (
    <>
      <BackHeader
        title={service.theme || formatDate(service.date)}
        action={
          <div className="flex gap-1.5 items-center">
            {servicePlaylist.length > 0 && (
              <PresentationController
                title=""
                lyricsText=""
                playlist={servicePlaylist}
              />
            )}
            {service.is_public && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={copyPublicLink}
                title={copied ? 'Link copied!' : 'Copy public link'}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </Button>
            )}
            <Link href={`/services/${id}/print`} target="_blank">
              <Button variant="ghost" size="icon-sm" title="Export PDF">
                <FileDown className="w-4 h-4" />
              </Button>
            </Link>
            {canEdit && (
              <Link href={`/services/${id}/edit`}>
                <Button variant="ghost" size="icon-sm"><Pencil className="w-4 h-4" /></Button>
              </Link>
            )}
            {canDelete && (
              <Button variant="ghost" size="icon-sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            )}
          </div>
        }
      >
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </BackHeader>

      <div className="px-4 pt-6 pb-10 space-y-6">
        {/* Info card */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-500/15 border border-accent-500/20 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                {service.theme || 'Untitled Service'}
              </h1>
              <p className="text-sm text-white/50">{formatDate(service.date)}</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.08] text-white/60 border border-white/10">
              {SERVICE_TYPES[service.type]}
            </span>
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full border font-medium',
              service.status === 'draft' && 'bg-white/[0.06] text-white/50 border-white/10',
              service.status === 'confirmed' && 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
              service.status === 'completed' && 'bg-accent-500/15 text-accent-400 border-accent-500/20'
            )}>
              {SERVICE_STATUSES[service.status]}
            </span>
            {(isOwner || isAppOwner) ? (
              <button
                onClick={toggleVisibility}
                className={cn(
                  'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors',
                  service.is_public
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25'
                    : 'bg-white/[0.06] text-white/50 border-white/10 hover:bg-white/10'
                )}
              >
                {service.is_public
                  ? <><Globe className="w-3 h-3" /> Public</>
                  : <><Lock className="w-3 h-3" /> Private</>}
              </button>
            ) : (
              <span className={cn(
                'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border',
                service.is_public
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                  : 'bg-white/[0.06] text-white/50 border-white/10'
              )}>
                {service.is_public ? <><Globe className="w-3 h-3" /> Public</> : <><Lock className="w-3 h-3" /> Private</>}
              </span>
            )}
          </div>

          {/* Creator */}
          {creatorName && (
            <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.06]">
              <UserRound className="w-3 h-3 text-white/30 shrink-0" />
              <p className="text-xs text-white/40">
                Created by{' '}
                <span className={isOwner ? 'text-white/60' : 'text-accent-400 font-medium'}>
                  {isOwner ? 'you' : creatorName}
                </span>
              </p>
            </div>
          )}

          {service.notes && (
            <p className="text-sm text-white/60 pt-1 border-t border-white/[0.06] whitespace-pre-wrap">
              {service.notes}
            </p>
          )}
        </div>

        {/* Setlist */}
        <SetlistManager
          serviceId={id}
          items={setlistItems}
          onUpdate={refetch}
          readOnly={!isOwner && !isAppOwner}
        />
      </div>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Service"
        description={`Delete this service? The songs in your library will not be affected.`}
        loading={deleting}
      />
    </>
  )
}
