'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, Globe, Lock, FileDown, Link2 } from 'lucide-react'
import { BackHeader } from '@/components/layout/PageHeader'
import { Button, buttonVariants } from '@/components/ui/Button'
import { Menu } from '@/components/ui/Menu'
import { SetlistManager } from '@/components/services/SetlistManager'
import { ConfirmModal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useService } from '@/hooks/useServices'
import { useCreatorName } from '@/hooks/useCreatorName'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { useSupabase } from '@/hooks/useSupabase'
import { toast } from '@/components/ui/Toaster'
import { SERVICE_TYPES, SERVICE_STATUSES } from '@/types/database'
import { PresentButton } from '@/components/presentation/PresentButton'
import { formatDate, todayLocal, goBack } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props { id: string }

export function ServiceDetailClient({ id }: Props) {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useAuth()
  const { service, loading, refetch } = useService(id)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const copyPublicLink = async () => {
    const url = `${window.location.origin}/services/${id}/view`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Public link copied')
    } catch {
      toast.info(url)
    }
  }

  const { isAdmin } = useRole()
  const isOwner = !!user && !!service && service.created_by === user.id
  const canEdit = isOwner || isAdmin
  const canDelete = isOwner || isAdmin
  const creatorName = useCreatorName(service?.created_by)
  const isPast = !!service && service.date < todayLocal()

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

  const back = (
    <Button variant="ghost" size="icon" onClick={() => goBack(router, '/services')} aria-label="Back">
      <ArrowLeft className="w-5 h-5" />
    </Button>
  )

  if (loading) {
    return (
      <>
        <BackHeader title="Loading service">{back}</BackHeader>
        <div className="px-4 pt-6 space-y-4 max-w-3xl" aria-busy="true">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    )
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <h1 className="text-lg font-semibold text-[var(--fg)]">Service not found</h1>
        <p className="text-sm text-[var(--fg-muted)] max-w-xs">It may have been deleted, or it&apos;s a private service from another account.</p>
        <Link href="/services" className={buttonVariants({ variant: 'secondary' })}>Back to services</Link>
      </div>
    )
  }

  const setlistItems = (service.service_songs ?? []) as any[]

  const servicePlaylist = setlistItems
    .filter((ss: any) => ss.songs)
    .map((ss: any) => {
      const songLyrics: { id: string; language: string; lyrics: string; is_default: boolean }[] = ss.songs.song_lyrics ?? []
      const defaultLyric = songLyrics.find((l) => l.is_default) ?? songLyrics[0]
      return {
        title: ss.songs.title as string,
        lyricsText: defaultLyric?.lyrics ?? '',
        availableLyrics: songLyrics.map((l) => ({ id: l.id, language: l.language, lyrics: l.lyrics })),
      }
    })
    .filter((item) => item.lyricsText)

  const typeLabel = SERVICE_TYPES[service.type]
  const statusLabel = SERVICE_STATUSES[service.status]

  return (
    <>
      <BackHeader
        title={service.theme || typeLabel}
        hideTitle
        action={
          <>
            {servicePlaylist.length > 0 && (
              <PresentButton title="" lyricsText="" playlist={servicePlaylist} label="Present" />
            )}
            <Menu
              items={[
                { label: 'Copy public link', icon: Link2, onSelect: copyPublicLink, hidden: !service.is_public },
                { label: 'Print / PDF', icon: FileDown, href: `/services/${id}/print` },
                { label: 'Edit service', icon: Pencil, href: `/services/${id}/edit`, hidden: !canEdit },
                { label: service.is_public ? 'Make private' : 'Make public', icon: service.is_public ? Lock : Globe, onSelect: toggleVisibility, hidden: !canEdit },
                { label: 'Delete service', icon: Trash2, onSelect: () => setDeleteOpen(true), destructive: true, hidden: !canDelete },
              ]}
            />
          </>
        }
      >
        {back}
      </BackHeader>

      <div className="px-4 pt-5 lg:pt-8 max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-medium text-[var(--accent-fg)]">{formatDate(service.date)}</p>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-[var(--fg)] break-words">
            {service.theme || typeLabel}
          </h1>
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {service.theme && (
              <div className="flex gap-1.5"><dt className="sr-only">Type</dt><dd className="text-[var(--fg-muted)]">{typeLabel}</dd></div>
            )}
            {creatorName && (
              <div className="flex gap-1.5"><dt className="text-[var(--fg-subtle)]">Leader</dt><dd className="text-[var(--fg)]">{isOwner ? 'You' : creatorName}</dd></div>
            )}
            <div className="flex gap-1.5 items-center">
              <dt className="sr-only">Status</dt>
              <dd className={cn('chip', service.status === 'confirmed' && 'chip-success', service.status === 'completed' && 'chip-accent')}>
                {isPast && service.status === 'draft' ? 'Not confirmed' : statusLabel}
              </dd>
            </div>
            <div className="flex gap-1.5 items-center">
              <dt className="sr-only">Visibility</dt>
              <dd className="inline-flex items-center gap-1 text-[var(--fg-muted)]">
                {service.is_public ? <Globe aria-hidden className="w-3.5 h-3.5" /> : <Lock aria-hidden className="w-3.5 h-3.5" />}
                {service.is_public ? 'Public' : 'Private'}
              </dd>
            </div>
          </dl>
          {service.notes && (
            <p className="text-sm text-[var(--fg-muted)] whitespace-pre-wrap pt-1">{service.notes}</p>
          )}
        </header>

        <SetlistManager
          serviceId={id}
          items={setlistItems}
          onUpdate={refetch}
          readOnly={!canEdit}
        />
      </div>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete service?"
        description="This removes the service and its setlist. The songs stay in your library."
        confirmLabel="Delete service"
        loading={deleting}
      />
    </>
  )
}
