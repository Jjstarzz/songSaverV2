'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Music2, ChevronDown, ChevronUp, Wifi } from 'lucide-react'
import { SERVICE_TYPES, formatKey } from '@/types/database'

interface SongLyric {
  id: string
  language: string
  lyrics: string
  is_default: boolean
}

interface Song {
  id: string
  title: string
  artist: string | null
  default_key: string | null
  preferred_key: string | null
  mode: 'major' | 'minor' | null
  song_lyrics: SongLyric[]
}

interface ServiceSong {
  id: string
  order_index: number
  key_override: string | null
  notes: string | null
  songs: Song
}

interface PublicService {
  id: string
  date: string
  type: 'sunday_morning' | 'midweek' | 'event' | 'other'
  theme: string | null
  notes: string | null
  status: string
  service_songs: ServiceSong[]
}

interface Props {
  id: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function SongRow({ item, index }: { item: ServiceSong; index: number }) {
  const [open, setOpen] = useState(false)
  const song = item.songs
  const displayKey = item.key_override ?? song.preferred_key ?? song.default_key
  const defaultLyric = song.song_lyrics?.find(l => l.is_default) ?? song.song_lyrics?.[0]

  return (
    <div className="border border-white/[0.08] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        {/* Number */}
        <span className="text-[var(--fg-subtle)] font-mono text-sm w-5 shrink-0 text-center">
          {index + 1}
        </span>

        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0">
          <Music2 className="w-4.5 h-4.5 w-[18px] h-[18px] text-accent-400" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--fg)] truncate">{song.title}</p>
          {song.artist && (
            <p className="text-xs text-[var(--fg-muted)] truncate">{song.artist}</p>
          )}
        </div>

        {/* Key badge */}
        {displayKey && (
          <span className="text-xs font-bold text-accent-400 bg-accent-500/10 border border-accent-500/20 px-2 py-0.5 rounded-lg shrink-0">
            {formatKey(displayKey, song.mode)}
          </span>
        )}

        {/* Expand toggle */}
        {defaultLyric && (
          open
            ? <ChevronUp className="w-4 h-4 text-[var(--fg-subtle)] shrink-0" />
            : <ChevronDown className="w-4 h-4 text-[var(--fg-subtle)] shrink-0" />
        )}
      </button>

      {/* Lyrics */}
      {open && defaultLyric && (
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.06]">
          {item.notes && (
            <p className="text-xs text-amber-400/80 mb-3 italic">{item.notes}</p>
          )}
          <pre className="text-sm text-[var(--fg-muted)] whitespace-pre-wrap font-sans leading-relaxed">
            {defaultLyric.lyrics}
          </pre>
        </div>
      )}
    </div>
  )
}

export function PublicServiceView({ id }: Props) {
  const [service, setService] = useState<PublicService | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/services/${id}/public`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(data => {
        if (data) setService(data)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-accent-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (notFound || !service) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <CalendarDays className="w-10 h-10 text-white/20" />
        <p className="text-white/50 text-sm">This service is not available.</p>
        <p className="text-white/30 text-xs">It may be private or the link may have changed.</p>
      </div>
    )
  }

  const sortedSongs = [...service.service_songs].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="min-h-screen bg-[#09090b] text-[var(--fg)]">
      {/* Header */}
      <div className="px-4 pt-12 pb-6 border-b border-white/[0.06]">
        <div className="max-w-xl mx-auto">
          {/* Branding */}
          <p className="text-[10px] text-white/25 tracking-[0.25em] uppercase mb-4">SongSaver</p>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CalendarDays className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white leading-tight">
                {service.theme || SERVICE_TYPES[service.type]}
              </h1>
              <p className="text-sm text-white/50 mt-0.5">{formatDate(service.date)}</p>
              <span className="inline-block mt-2 text-xs text-white/40 bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-white/[0.08]">
                {SERVICE_TYPES[service.type]}
              </span>
            </div>
          </div>

          {service.notes && (
            <p className="mt-4 text-sm text-white/60 whitespace-pre-wrap leading-relaxed">
              {service.notes}
            </p>
          )}
        </div>
      </div>

      {/* Setlist */}
      <div className="px-4 py-6 max-w-xl mx-auto">
        {sortedSongs.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Music2 className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">No songs in this service yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="section-label mb-3">
              Order of Service · {sortedSongs.length} {sortedSongs.length === 1 ? 'song' : 'songs'}
            </p>
            {sortedSongs.map((item, i) => (
              <SongRow key={item.id} item={item} index={i} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-white/20">Powered by SongSaver</p>
        </div>
      </div>
    </div>
  )
}
