'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useService } from '@/hooks/useServices'
import { useUserSongKeys } from '@/hooks/useUserSongKeys'
import { useFeatureTable } from '@/hooks/useFeatureTable'
import { ReadingControls } from '@/components/songs/LyricsViewer'
import { Skeleton } from '@/components/ui/Skeleton'
import { parseLyrics } from '@/lib/parseLyrics'
import { describeLyrics, KIND_LABEL } from '@/lib/lyricsLanguage'
import { formatKey, SERVICE_TYPES } from '@/types/database'
import { cn, goBack } from '@/lib/utils'
import type { Arrangement, Singer, SingerSongKey } from '@/lib/features'

interface Row {
  id: string
  song_id: string
  key_override: string | null
  notes: string | null
  arrangement_id?: string | null
  singer_id?: string | null
  slot_label?: string | null
  songs: {
    id: string; title: string; artist: string | null; default_key: string | null; preferred_key: string | null
    mode: 'major' | 'minor' | null; bpm: number | null; time_signature: string | null; notes: string | null; original_language: string | null
    song_lyrics: { id: string; language: string; lyrics: string; is_default: boolean }[]
  }
}

/** Rehearsal mode: one song at a time with key, arrangement, notes and lyrics. */
export default function RehearsePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { service, loading } = useService(id)
  const userKeys = useUserSongKeys()
  const rows = useMemo(() => ((service?.service_songs ?? []) as unknown as Row[]).filter((r) => r.songs), [service])
  const songIds = rows.map((r) => r.song_id)
  const arrangements = useFeatureTable<Arrangement>('song_arrangements', { in: ['song_id', songIds] })
  const singers = useFeatureTable<Singer>('singers', { skip: arrangements.missing })
  const singerKeys = useFeatureTable<SingerSongKey>('singer_song_keys', { in: ['song_id', songIds], skip: arrangements.missing })
  const [idx, setIdx] = useState(0)
  const [lang, setLang] = useState<string | null>(null)

  const row = rows[idx]
  useEffect(() => { setLang(null); window.scrollTo({ top: 0 }) }, [idx])

  // Arrow keys / clicker move between songs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') setIdx((i) => Math.min(rows.length - 1, i + 1))
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setIdx((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows.length])

  const close = () => goBack(router, `/services/${id}`)

  if (loading) {
    return <div className="p-6 space-y-4" aria-busy="true"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-64 w-full" /></div>
  }
  if (!service || rows.length === 0) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-lg font-semibold text-[var(--fg)]">{service ? 'This setlist is empty' : 'Service not found'}</h1>
        <button type="button" onClick={close} className="h-11 px-4 rounded-xl border border-[var(--border-strong)] text-sm text-[var(--fg)]">Back to service</button>
      </div>
    )
  }

  const song = row.songs
  const arr = arrangements.rows.find((a) => a.id === row.arrangement_id)
  const singer = singers.rows.find((s) => s.id === row.singer_id)
  const singerKey = singer && singerKeys.rows.find((k) => k.singer_id === singer.id && k.song_id === song.id)?.key
  const key = row.key_override || arr?.key || userKeys[song.id] || song.preferred_key || song.default_key
  const keySource = row.key_override ? 'Service key' : arr?.key ? 'Arrangement key' : userKeys[song.id] ? 'Your key' : 'Song key'
  const lyrics = song.song_lyrics ?? []
  const lyric = lyrics.find((l) => l.language === lang) ?? lyrics.find((l) => l.is_default) ?? lyrics[0]
  const desc = lyric ? describeLyrics(lyric.language, lyric.lyrics, song.original_language) : null

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg)]">
      {/* Top bar */}
      <header className="sticky-header-bg sticky top-0 z-30 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 px-3 h-14 max-w-3xl mx-auto">
          <button type="button" onClick={close} aria-label="Close rehearsal mode" className="w-11 h-11 flex items-center justify-center rounded-xl text-[var(--fg-muted)] hover:bg-[var(--bg-hover)]">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--fg-subtle)] truncate">Rehearsal · {service.theme || SERVICE_TYPES[service.type]}</p>
            <h1 className="text-[15px] font-semibold text-[var(--fg)] truncate">Song {idx + 1} of {rows.length}</h1>
          </div>
        </div>
        {/* Jump to a song */}
        <nav aria-label="Songs in this setlist" className="max-w-3xl mx-auto px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {rows.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setIdx(i)}
              aria-current={i === idx ? 'true' : undefined}
              className={cn('shrink-0 max-w-[180px] h-9 px-3 rounded-lg border text-sm truncate', i === idx ? 'bg-accent-600 border-accent-600 text-white' : 'border-[var(--border)] text-[var(--fg-muted)]')}
            >
              {i + 1}. {r.songs.title}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-5 pb-32 space-y-5">
        <div>
          {row.slot_label && <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">{row.slot_label}</p>}
          <h2 className="text-2xl font-semibold text-[var(--fg)] break-words">{song.title}</h2>
          {song.artist && <p className="text-[var(--fg-muted)]">{song.artist}</p>}
        </div>

        {/* Key + tempo + singer */}
        <dl className="flex flex-wrap gap-2">
          <div className="rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-2">
            <dt className="text-[11px] font-medium text-[var(--fg-muted)]">{keySource}</dt>
            <dd className="text-xl font-semibold text-[var(--accent-fg)] tabular">{key ? formatKey(key, song.mode) : '—'}</dd>
          </div>
          {(arr?.tempo || song.bpm || song.time_signature) && (
            <div className="rounded-xl border border-[var(--border)] px-4 py-2">
              <dt className="text-[11px] font-medium text-[var(--fg-muted)]">Tempo</dt>
              <dd className="text-xl font-semibold text-[var(--fg)] tabular">{[arr?.tempo || song.bpm ? `${arr?.tempo || song.bpm} BPM` : null, song.time_signature].filter(Boolean).join(' · ')}</dd>
            </div>
          )}
          {singer && (
            <div className="rounded-xl border border-[var(--border)] px-4 py-2">
              <dt className="text-[11px] font-medium text-[var(--fg-muted)]">Lead</dt>
              <dd className="text-xl font-semibold text-[var(--fg)]">{singer.name}{singerKey ? <span className="text-sm font-normal text-[var(--fg-muted)]"> sings in {singerKey}</span> : null}</dd>
            </div>
          )}
        </dl>

        {/* Arrangement + notes */}
        {(arr || row.notes || song.notes) && (
          <section aria-label="Arrangement and notes" className="surface p-4 space-y-2 text-[15px]">
            {arr && <p className="font-semibold text-[var(--fg)]">Arrangement: {arr.name}</p>}
            {arr?.structure && <p className="text-[var(--fg)] tabular">{arr.structure}</p>}
            {(arr?.intro || arr?.ending) && <p className="text-[var(--fg-muted)]">{[arr.intro && `Intro: ${arr.intro}`, arr.ending && `Ending: ${arr.ending}`].filter(Boolean).join(' · ')}</p>}
            {arr?.notes && <p className="text-[var(--fg-muted)] whitespace-pre-wrap">{arr.notes}</p>}
            {row.notes && <p className="text-[var(--fg)] whitespace-pre-wrap"><span className="text-[var(--fg-subtle)]">For this service: </span>{row.notes}</p>}
            {song.notes && <p className="text-[var(--fg-muted)] whitespace-pre-wrap"><span className="text-[var(--fg-subtle)]">Song notes: </span>{song.notes}</p>}
          </section>
        )}

        {/* Lyrics */}
        <section aria-label="Lyrics" className="space-y-3">
          {lyrics.length > 1 && (
            <div role="tablist" aria-label="Lyrics language" className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {lyrics.map((l) => {
                const d = describeLyrics(l.language, l.lyrics, song.original_language)
                const sel = l.id === lyric?.id
                return (
                  <button key={l.id} role="tab" aria-selected={sel} type="button" onClick={() => setLang(l.language)}
                    className={cn('shrink-0 min-h-[44px] px-3 rounded-xl border text-sm text-left', sel ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-fg)]' : 'border-[var(--border)] text-[var(--fg-muted)]')}>
                    {d.name}{d.kind ? <span className="block text-[11px]">{KIND_LABEL[d.kind]}</span> : null}
                  </button>
                )
              })}
            </div>
          )}
          <ReadingControls />
          {lyric ? (
            <div className="surface px-4 py-5 sm:px-6 space-y-6" lang={desc?.langAttr}>
              {parseLyrics(lyric.lyrics).map((sec, i) => (
                <div key={i}>
                  {sec.label && <h3 className="text-xs font-semibold tracking-wide uppercase text-[var(--accent-fg)] mb-1.5" lang="en">{sec.label}</h3>}
                  <p className="lyrics-text" lang={desc?.langAttr}>{sec.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="surface p-5 text-[var(--fg-muted)]">No lyrics saved for this song.</p>
          )}
        </section>
      </main>

      {/* Big previous / next */}
      <nav aria-label="Previous and next song" className="fixed bottom-0 inset-x-0 z-30 border-t border-[var(--border)] bg-[var(--bg-surface)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-3xl mx-auto flex gap-2 p-3">
          <button type="button" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
            className="flex-1 h-14 rounded-2xl border border-[var(--border-strong)] text-[var(--fg)] font-medium flex items-center justify-center gap-2 disabled:opacity-35">
            <ChevronLeft aria-hidden className="w-5 h-5" />
            <span className="truncate">{idx > 0 ? rows[idx - 1].songs.title : 'Previous'}</span>
          </button>
          <button type="button" onClick={() => setIdx((i) => Math.min(rows.length - 1, i + 1))} disabled={idx === rows.length - 1}
            className="flex-1 h-14 rounded-2xl bg-accent-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-35">
            <span className="truncate">{idx < rows.length - 1 ? rows[idx + 1].songs.title : 'Last song'}</span>
            <ChevronRight aria-hidden className="w-5 h-5" />
          </button>
        </div>
      </nav>
    </div>
  )
}
