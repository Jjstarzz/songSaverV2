'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, Trash2, Music2,
  ExternalLink, Youtube, Music, ChevronDown, ChevronUp,
} from 'lucide-react'
import { BackHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { LyricsViewer } from '@/components/songs/LyricsViewer'
import { KeySuggester } from '@/components/songs/KeySuggester'
import { SongTransitions } from '@/components/songs/SongTransitions'
import { ConfirmModal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSong } from '@/hooks/useSongs'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { useUserSongKey } from '@/hooks/useUserSongKey'
import { useCreatorName } from '@/hooks/useCreatorName'
import { MUSICAL_KEYS, formatKey } from '@/types/database'
import { toast } from '@/components/ui/Toaster'
import { cn } from '@/lib/utils'
import { PresentationController } from '@/components/presentation/PresentationController'

interface Props {
  id: string
}

export function SongDetailClient({ id }: Props) {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useAuth()
  const { song, loading, refetch } = useSong(id)
  const isOwner = !!user && !!song && song.created_by === user.id
  const creatorName = useCreatorName(song?.created_by)
  const { track } = useRecentlyViewed()
  const { userKey, setKey: setUserKey } = useUserSongKey(id)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [keyPickerOpen, setKeyPickerOpen] = useState(false)

  useEffect(() => {
    if (song) track({ id: song.id, title: song.title, artist: song.artist })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id])
  const [deleting, setDeleting] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

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

  if (loading) {
    return (
      <>
        <BackHeader title="">
          <div className="w-8 h-8" />
        </BackHeader>
        <div className="px-4 pt-6 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </>
    )
  }

  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-white/50">Song not found</p>
        <Link href="/songs">
          <Button variant="secondary">Back to songs</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <BackHeader
        title={song.title}
        action={
          <div className="flex items-center gap-1.5">
            {(() => {
              const defaultLyric = song.song_lyrics?.find(l => l.is_default) ?? song.song_lyrics?.[0]
              return defaultLyric ? (
                <PresentationController title={song.title} lyricsText={defaultLyric.lyrics} />
              ) : null
            })()}
            {isOwner && (
              <>
                <Link href={`/songs/${id}/edit`}>
                  <Button variant="ghost" size="icon-sm">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon-sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </>
            )}
          </div>
        }
      >
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </BackHeader>

      <div className="px-4 pt-6 pb-10 space-y-6">
        {/* Hero */}
        <div>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-600 to-purple-700 flex items-center justify-center shrink-0">
              <Music2 className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white leading-tight">{song.title}</h1>
              {song.artist && (
                <p className="text-sm text-white/50 mt-0.5">{song.artist}</p>
              )}
              {song.tags.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {song.tags.map((tag) => (
                    <span key={tag} className="tag-pill">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2.5">
          {(song.preferred_key || song.default_key) && (
            <div className="glass-card p-3 text-center">
              <p className="section-label text-[10px] mb-1">Song Key</p>
              <p className="text-base font-bold text-accent-400">
                {formatKey(song.preferred_key || song.default_key, song.mode)}
              </p>
            </div>
          )}
          {song.bpm && (
            <div className="glass-card p-3 text-center">
              <p className="section-label text-[10px] mb-1">BPM</p>
              <p className="text-base font-bold text-white">{song.bpm}</p>
            </div>
          )}
          {song.time_signature && (
            <div className="glass-card p-3 text-center">
              <p className="section-label text-[10px] mb-1">Time</p>
              <p className="text-base font-bold text-white">{song.time_signature}</p>
            </div>
          )}
        </div>

        {/* Per-user key preference */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label text-[10px] mb-0.5">Your Key</p>
              <p className={cn('text-lg font-bold', userKey ? 'text-emerald-400' : 'text-[var(--fg-subtle)]')}>
                {userKey ?? 'Not set'}
              </p>
              {userKey && song.default_key && userKey !== song.default_key && (
                <p className="text-[10px] text-[var(--fg-subtle)] mt-0.5">
                  Song key: {formatKey(song.preferred_key || song.default_key, song.mode)}
                </p>
              )}
            </div>
            <button
              onClick={() => setKeyPickerOpen((v) => !v)}
              className="text-xs text-accent-400 hover:text-accent-300 transition-colors"
            >
              {keyPickerOpen ? 'Cancel' : userKey ? 'Change' : 'Set key'}
            </button>
          </div>

          {keyPickerOpen && (
            <div className="mt-3 animate-fade-in">
              <div className="flex gap-1.5 flex-wrap">
                {userKey && (
                  <button
                    onClick={async () => { await setUserKey(null); setKeyPickerOpen(false) }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--bg-input)] text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    Clear
                  </button>
                )}
                {MUSICAL_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={async () => { await setUserKey(key); setKeyPickerOpen(false) }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      userKey === key
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]'
                    )}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lyrics */}
        <section>
          <LyricsViewer
            songId={id}
            lyrics={song.song_lyrics ?? []}
            onUpdate={refetch}
            isOwner={isOwner}
          />
        </section>

        {/* Song Transitions */}
        <section>
          <SongTransitions songId={id} songTitle={song.title} />
        </section>

        {/* Key Suggester */}
        <section>
          <KeySuggester songKey={song.default_key} />
        </section>

        {/* Details accordion */}
        <section>
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="section-label">Details</span>
            {detailsOpen ? (
              <ChevronUp className="w-4 h-4 text-white/30" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/30" />
            )}
          </button>

          {detailsOpen && (
            <div className="mt-3 glass-card p-4 space-y-3 animate-fade-in">
              {song.notes && (
                <div>
                  <p className="section-label text-[10px] mb-1">Notes</p>
                  <p className="text-sm text-white/70 whitespace-pre-wrap">{song.notes}</p>
                </div>
              )}
              {song.youtube_url && (
                <a
                  href={song.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  <Youtube className="w-4 h-4" />
                  Watch on YouTube
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              )}
              {song.spotify_url && (
                <a
                  href={song.spotify_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Music className="w-4 h-4" />
                  Open in Spotify
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              )}
              <div className="pt-1 border-t border-white/[0.06] space-y-0.5">
                <p className="text-xs text-white/30">
                  Added {new Date(song.created_at).toLocaleDateString()}
                </p>
                {creatorName && (
                  <p className="text-xs text-white/30">
                    Added by{' '}
                    <span className={isOwner ? 'text-white/50' : 'text-accent-400'}>
                      {isOwner ? 'you' : creatorName}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Song"
        description={`Are you sure you want to delete "${song.title}"? This will remove all lyrics and recordings associated with this song.`}
        loading={deleting}
      />
    </>
  )
}
