'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, Trash2, ExternalLink, Youtube, Music, ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react'
import { BackHeader } from '@/components/layout/PageHeader'
import { Button, buttonVariants } from '@/components/ui/Button'
import { LyricsViewer } from '@/components/songs/LyricsViewer'
import { KeySuggester } from '@/components/songs/KeySuggester'
import { SongTransitions } from '@/components/songs/SongTransitions'
import { SongArrangements, SongSingerKeys, SongFeedback } from '@/components/songs/SongExtras'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { Menu } from '@/components/ui/Menu'
import { Skeleton } from '@/components/ui/Skeleton'
import { PresentButton } from '@/components/presentation/PresentButton'
import { useSong } from '@/hooks/useSongs'
import { useService } from '@/hooks/useServices'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { useUserSongKey } from '@/hooks/useUserSongKey'
import { useCreatorName } from '@/hooks/useCreatorName'
import { useRole } from '@/hooks/useRole'
import { MUSICAL_KEYS, formatKey, LANGUAGE_NAMES, SERVICE_TYPES } from '@/types/database'
import { toast } from '@/components/ui/Toaster'
import { cn, goBack } from '@/lib/utils'

interface Props {
  id: string
}

function Meta({ label, children, quiet }: { label: string; children: React.ReactNode; quiet?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 min-w-[84px]">
      <dt className="text-[11px] font-medium text-[var(--fg-subtle)]">{label}</dt>
      <dd className={cn('text-[15px] font-semibold tabular', quiet ? 'text-[var(--fg-subtle)] font-normal' : 'text-[var(--fg)]')}>{children}</dd>
    </div>
  )
}

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`side-${title}`} className="space-y-3">
      <h2 id={`side-${title}`} className="section-label">{title}</h2>
      {children}
    </section>
  )
}

export function SongDetailClient({ id }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('serviceId')
  const { service: navService } = useService(serviceId ?? '')
  const supabase = useSupabase()
  const { user } = useAuth()
  const { song, loading, refetch } = useSong(id)
  const { isAdmin } = useRole()
  const isOwner = !!user && !!song && song.created_by === user.id
  const canEdit = isOwner || isAdmin
  const creatorName = useCreatorName(song?.created_by)
  const { track } = useRecentlyViewed()
  const { userKey, setKey: setUserKey } = useUserSongKey(id)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [keyPickerOpen, setKeyPickerOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [serviceHistory, setServiceHistory] = useState<{ service_id: string; date: string; theme: string | null; type: string }[]>([])

  useEffect(() => {
    supabase
      .from('service_songs')
      .select('service_id, services(id, date, theme, type)')
      .eq('song_id', id)
      .then(({ data }) => {
        if (!data) return
        const history = (data as unknown as { service_id: string; services: { date: string; theme: string | null; type: string } | null }[])
          .flatMap((ss) => ss.services ? [{ service_id: ss.service_id, ...ss.services }] : [])
          .sort((a, b) => b.date.localeCompare(a.date))
        setServiceHistory(history)
      })
  }, [id, supabase])

  useEffect(() => {
    if (song) track({ id: song.id, title: song.title, artist: song.artist })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id])

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('songs').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete song')
      setDeleting(false)
      return
    }
    toast.success('Song deleted')
    router.push('/songs')
  }

  const chooseKey = async (key: string | null) => {
    const err = await setUserKey(key)
    if (err) toast.error('Could not save your key')
    else toast.success(key ? `Your key set to ${key}` : 'Your key cleared')
    setKeyPickerOpen(false)
  }

  const back = (
    <Button variant="ghost" size="icon" onClick={() => goBack(router, '/songs')} aria-label="Back">
      <ArrowLeft className="w-5 h-5" />
    </Button>
  )

  if (loading) {
    return (
      <>
        <BackHeader title="Loading song">{back}</BackHeader>
        <div className="px-4 pt-6 space-y-4 max-w-3xl" aria-busy="true">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <div className="flex gap-2"><Skeleton className="h-14 w-24" /><Skeleton className="h-14 w-24" /><Skeleton className="h-14 w-24" /></div>
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    )
  }

  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <h1 className="text-lg font-semibold text-[var(--fg)]">Song not found</h1>
        <p className="text-sm text-[var(--fg-muted)]">It may have been deleted, or it isn&apos;t saved on this device for offline use.</p>
        <Link href="/songs" className={buttonVariants({ variant: 'secondary' })}>Back to songs</Link>
      </div>
    )
  }

  // Prev/next navigation when viewing a song from within a service's setlist
  const serviceSongs = navService?.service_songs ?? []
  const navIdx = serviceSongs.findIndex((ss) => ss.song_id === id)
  const prevInService = navIdx > 0 ? serviceSongs[navIdx - 1] : null
  const nextInService = navIdx >= 0 && navIdx < serviceSongs.length - 1 ? serviceSongs[navIdx + 1] : null

  const songKey = song.preferred_key || song.default_key
  const defaultLyric = song.song_lyrics?.find((l) => l.is_default) ?? song.song_lyrics?.[0]
  const hasDetails = !!(song.notes || song.youtube_url || song.spotify_url || song.original_language || creatorName)

  return (
    <>
      <BackHeader
        title={song.title}
        hideTitle
        action={
          <>
            {defaultLyric && (
              <PresentButton
                title={song.title}
                lyricsText={defaultLyric.lyrics}
                availableLyrics={(song.song_lyrics ?? []).map((l) => ({ id: l.id, language: l.language, lyrics: l.lyrics }))}
              />
            )}
            <Menu
              items={[
                { label: 'Edit song', icon: Pencil, href: `/songs/${id}/edit`, hidden: !canEdit },
                { label: 'Delete song', icon: Trash2, onSelect: () => setDeleteOpen(true), destructive: true, hidden: !canEdit },
              ]}
            />
          </>
        }
      >
        {back}
      </BackHeader>

      {/* Prev/next within the service this song was opened from */}
      {navService && navIdx !== -1 && (
        <nav aria-label="Songs in this service" className="px-4 pt-3 flex items-center gap-2 max-w-3xl">
          <button
            onClick={() => prevInService && router.push(`/songs/${prevInService.song_id}?serviceId=${serviceId}`)}
            disabled={!prevInService}
            aria-label="Previous song in service"
            className="w-11 h-11 flex items-center justify-center rounded-xl border border-[var(--border-strong)] text-[var(--fg-muted)] disabled:opacity-35"
          >
            <ChevronLeft aria-hidden className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-xs font-medium text-[var(--fg-muted)] truncate">{navService.theme || 'Service'}</p>
            <p className="text-xs text-[var(--fg-subtle)]">Song {navIdx + 1} of {serviceSongs.length}</p>
          </div>
          <button
            onClick={() => nextInService && router.push(`/songs/${nextInService.song_id}?serviceId=${serviceId}`)}
            disabled={!nextInService}
            aria-label="Next song in service"
            className="w-11 h-11 flex items-center justify-center rounded-xl border border-[var(--border-strong)] text-[var(--fg-muted)] disabled:opacity-35"
          >
            <ChevronRight aria-hidden className="w-5 h-5" />
          </button>
        </nav>
      )}

      <div className="px-4 pt-5 lg:pt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        {/* Main column: title, compact details, lyrics */}
        <article className="min-w-0 max-w-[70ch] space-y-5">
          <header>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-[var(--fg)] break-words">{song.title}</h1>
            {song.artist && <p className="text-base text-[var(--fg-muted)] mt-1">{song.artist}</p>}
            {song.tags.length > 0 && (
              <div className="flex gap-1.5 mt-2.5 flex-wrap">
                {song.tags.filter((t) => /\p{L}/u.test(t)).map((tag) => <span key={tag} className="tag-pill">{tag}</span>)}
              </div>
            )}
          </header>

          <dl className="flex flex-wrap gap-2">
            <Meta label="Song key" quiet={!songKey}>{songKey ? formatKey(songKey, song.mode) : 'Not set'}</Meta>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] min-w-[84px]">
              <button
                type="button"
                onClick={() => setKeyPickerOpen(true)}
                className="w-full h-full text-left px-3 py-2 rounded-xl hover:bg-[var(--bg-hover)]"
                aria-label={userKey ? `Your key: ${userKey}. Change` : 'Your key: not set. Set your key'}
              >
                <dt className="text-[11px] font-medium text-[var(--fg-subtle)]">Your key</dt>
                <dd className={cn('text-[15px] font-semibold', userKey ? 'text-[var(--success)]' : 'text-[var(--accent-fg)] font-medium')}>
                  {userKey ?? 'Set key'}
                </dd>
              </button>
            </div>
            {song.time_signature && <Meta label="Time">{song.time_signature}</Meta>}
            {song.bpm ? <Meta label="Tempo">{song.bpm} BPM</Meta> : null}
            {song.verseview_number ? <Meta label="VerseView">#{song.verseview_number}</Meta> : null}
          </dl>

          <LyricsViewer
            songId={id}
            lyrics={song.song_lyrics ?? []}
            onUpdate={refetch}
            isOwner={canEdit}
            originalLanguage={song.original_language}
          />
        </article>

        {/* Secondary details: side panel on desktop, below the lyrics on phones */}
        <aside className="mt-10 lg:mt-0 space-y-8 lg:sticky lg:top-20 lg:self-start" aria-label="Song details">
          {hasDetails && (
            <SidePanel title="About">
              <div className="surface p-4 space-y-3 text-sm">
                {song.original_language && (
                  <p><span className="text-[var(--fg-subtle)]">Original language: </span><span className="text-[var(--fg)]">{LANGUAGE_NAMES[song.original_language] ?? song.original_language}</span></p>
                )}
                {song.notes && <p className="text-[var(--fg-muted)] whitespace-pre-wrap">{song.notes}</p>}
                {song.youtube_url && (
                  <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-h-[44px] text-[var(--fg)] hover:text-[var(--accent-fg)]">
                    <Youtube aria-hidden className="w-4 h-4" /> Watch on YouTube <ExternalLink aria-hidden className="w-3.5 h-3.5 ml-auto text-[var(--fg-subtle)]" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
                {song.spotify_url && (
                  <a href={song.spotify_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-h-[44px] text-[var(--fg)] hover:text-[var(--accent-fg)]">
                    <Music aria-hidden className="w-4 h-4" /> Open in Spotify <ExternalLink aria-hidden className="w-3.5 h-3.5 ml-auto text-[var(--fg-subtle)]" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
                <p className="text-xs text-[var(--fg-subtle)] pt-2 border-t border-[var(--border)]">
                  Added {new Date(song.created_at).toLocaleDateString()}{creatorName ? ` by ${isOwner ? 'you' : creatorName}` : ''}
                </p>
              </div>
            </SidePanel>
          )}

          <SongArrangements songId={id} songOwner={song.created_by} canEditSong={canEdit} />

          <SongSingerKeys songId={id} />

          <SongTransitions songId={id} songTitle={song.title} />

          <SongFeedback songId={id} />

          {serviceHistory.length > 0 && (
            <SidePanel title={`Sung in ${serviceHistory.length} ${serviceHistory.length === 1 ? 'service' : 'services'}`}>
              <ul className="surface divide-y divide-[var(--border)]">
                {serviceHistory.slice(0, 8).map((s) => (
                  <li key={s.service_id}>
                    <Link href={`/services/${s.service_id}`} className="flex items-center gap-3 px-4 min-h-[52px] py-2 hover:bg-[var(--bg-hover)] first:rounded-t-2xl last:rounded-b-2xl">
                      <CalendarDays aria-hidden className="w-4 h-4 text-[var(--fg-subtle)] shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-[var(--fg)] truncate">{s.theme || SERVICE_TYPES[s.type as keyof typeof SERVICE_TYPES] || 'Service'}</span>
                        <span className="block text-xs text-[var(--fg-subtle)]">
                          {new Date(s.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </span>
                      <ChevronRight aria-hidden className="w-4 h-4 text-[var(--fg-subtle)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </SidePanel>
          )}

          <KeySuggester songKey={song.default_key} />
        </aside>
      </div>

      <Modal open={keyPickerOpen} onClose={() => setKeyPickerOpen(false)} title="Your key for this song" variant="sheet">
        <p className="text-sm text-[var(--fg-muted)] mb-4">
          Only you see this. {songKey ? `The song is written in ${formatKey(songKey, song.mode)}.` : ''}
        </p>
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2" role="group" aria-label="Choose a key">
          {MUSICAL_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => chooseKey(key)}
              aria-pressed={userKey === key}
              className={cn(
                'h-11 rounded-xl border text-sm font-semibold transition-colors',
                userKey === key
                  ? 'bg-accent-600 border-accent-600 text-white'
                  : 'bg-[var(--bg-input)] border-[var(--border-strong)] text-[var(--fg)] hover:bg-[var(--bg-hover)]'
              )}
            >
              {key}
            </button>
          ))}
        </div>
        {userKey && (
          <Button variant="ghost" className="mt-4 w-full" onClick={() => chooseKey(null)}>Clear my key</Button>
        )}
      </Modal>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete song?"
        description={`"${song.title}" and all its lyrics will be permanently deleted. It will also be removed from any setlists.`}
        confirmLabel="Delete song"
        loading={deleting}
      />
    </>
  )
}
