'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import { SERVICE_TYPES, formatKey } from '@/types/database'
import { Loader2, Printer } from 'lucide-react'

/* ─── Types ─────────────────────────────────── */
interface PrintSong {
  order_index: number
  key_override: string | null
  songs: {
    id: string
    title: string
    artist: string | null
    default_key: string | null
    mode: 'major' | 'minor' | null
    song_lyrics: { lyrics: string; language: string; is_default: boolean }[]
  }
}

interface PrintService {
  date: string
  type: string
  theme: string | null
  notes: string | null
  status: string
  is_public: boolean
}

/* ─── Helpers ────────────────────────────────── */
function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

type LyricsSection = { label: string | null; lines: string[] }

function parseLyricSections(raw: string): LyricsSection[] {
  const sections: LyricsSection[] = []
  let cur: LyricsSection = { label: null, lines: [] }
  for (const line of raw.split('\n')) {
    const m = line.match(/^\[(.+)\]$/)
    if (m) {
      if (cur.lines.some((l) => l.trim())) sections.push(cur)
      cur = { label: m[1], lines: [] }
    } else {
      cur.lines.push(line)
    }
  }
  if (cur.lines.some((l) => l.trim())) sections.push(cur)
  return sections
}

/* ─── Page ───────────────────────────────────── */
export default function PrintPage() {
  const params = useParams()
  const id = params.id as string
  const supabase = useSupabase()
  const { user, loading: authLoading } = useAuth()

  const [service, setService] = useState<PrintService | null>(null)
  const [songs, setSongs] = useState<PrintSong[]>([])
  const [userKeys, setUserKeys] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [{ data: svc }, { data: svcSongs }] = await Promise.all([
        supabase
          .from('services')
          .select('date, type, theme, notes, status, is_public')
          .eq('id', id)
          .single(),
        supabase
          .from('service_songs')
          .select('order_index, key_override, songs(id, title, artist, default_key, mode, song_lyrics(lyrics, language, is_default))')
          .eq('service_id', id)
          .order('order_index', { ascending: true }),
      ])

      if (svc) setService(svc as unknown as PrintService)

      const list = (svcSongs ?? []) as unknown as PrintSong[]
      setSongs(list)

      // Fetch personal key overrides
      const songIds = list.map((s) => s.songs?.id).filter(Boolean) as string[]
      if (songIds.length) {
        const { data: prefs } = await supabase
          .from('user_song_preferences')
          .select('song_id, preferred_key')
          .eq('user_id', user!.id)
          .in('song_id', songIds)
        const map: Record<string, string> = {}
        ;(prefs ?? []).forEach((p: any) => { if (p.preferred_key) map[p.song_id] = p.preferred_key })
        setUserKeys(map)
      }

      setReady(true)
    }
    load()
  }, [user, supabase, id])

  // Auto-trigger print once content is ready
  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [ready])

  if (authLoading || !ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white">
        <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
        <p className="text-sm text-gray-500">Preparing document…</p>
      </div>
    )
  }

  return (
    <>
      {/* ── Print + screen styles ───────────────── */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f0f0f0; font-family: Georgia, 'Times New Roman', serif; color: #111; }

        /* Screen wrapper */
        .page-wrap {
          max-width: 720px;
          margin: 0 auto;
          background: #fff;
          padding: 3rem 3.5rem 4rem;
          min-height: 100vh;
        }

        /* Song block must not split across pages */
        .song-block { break-inside: avoid; page-break-inside: avoid; }

        .section-label {
          font-family: Arial, sans-serif;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #888;
          margin-bottom: 0.2rem;
        }

        .key-badge {
          display: inline-block;
          font-family: Arial, sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          color: #6d28d9;
          background: #ede9fe;
          border: 1px solid #c4b5fd;
          border-radius: 4px;
          padding: 1px 7px;
          margin-left: 8px;
          vertical-align: middle;
        }

        @media print {
          @page { margin: 1.5cm 2cm; size: A4; }
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .page-wrap { padding: 0; max-width: 100%; margin: 0; }
        }

        @media screen {
          .toolbar {
            position: fixed;
            top: 1rem;
            right: 1rem;
            display: flex;
            gap: 0.5rem;
            z-index: 100;
          }
          .btn {
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
          }
          .btn-back  { background: #fff; border: 1px solid #ddd; color: #444; }
          .btn-print { background: #7c3aed; color: #fff; }
        }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="toolbar no-print" style={{ fontFamily: 'Arial, sans-serif' }}>
        <button className="btn btn-back" onClick={() => window.history.back()}>← Back</button>
        <button className="btn btn-print" onClick={() => window.print()}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print / Save PDF
          </span>
        </button>
      </div>

      <div className="page-wrap">
        {/* ── Service header ─────────────────────── */}
        <div style={{ borderBottom: '2px solid #111', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 'bold', lineHeight: 1.2 }}>
            {service?.theme || (service ? SERVICE_TYPES[service.type as keyof typeof SERVICE_TYPES] : 'Service')}
          </h1>
          <p style={{ color: '#555', marginTop: '0.3rem', fontSize: '0.9rem', fontFamily: 'Arial, sans-serif' }}>
            {service ? fmtDate(service.date) : ''}&ensp;·&ensp;
            {service ? SERVICE_TYPES[service.type as keyof typeof SERVICE_TYPES] : ''}
          </p>
          {service?.notes && (
            <p style={{ color: '#666', marginTop: '0.5rem', fontSize: '0.85rem', fontStyle: 'italic' }}>
              {service.notes}
            </p>
          )}
        </div>

        {/* ── Songs ─────────────────────────────── */}
        {songs.length === 0 && (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '3rem 0', fontFamily: 'Arial, sans-serif' }}>
            No songs in this service.
          </p>
        )}

        {songs.map((item, index) => {
          const song = item.songs
          const resolvedKey = item.key_override ?? userKeys[song.id] ?? song.default_key
          const keyLabel = formatKey(resolvedKey, song.mode)

          const defaultLyric =
            song.song_lyrics?.find((l) => l.is_default) ??
            song.song_lyrics?.[0] ?? null

          const sections = defaultLyric ? parseLyricSections(defaultLyric.lyrics) : []

          return (
            <div
              key={index}
              className="song-block"
              style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: index < songs.length - 1 ? '1px solid #e5e5e5' : 'none' }}
            >
              {/* Song title row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.75rem', color: '#aaa', minWidth: '1.4rem', paddingTop: '0.2rem' }}>
                  {index + 1}.
                </span>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', lineHeight: 1.3 }}>
                    {song.title}
                    {keyLabel && <span className="key-badge">{keyLabel}</span>}
                  </h2>
                  {song.artist && (
                    <p style={{ color: '#777', fontSize: '0.8rem', fontFamily: 'Arial, sans-serif', marginTop: '2px' }}>
                      {song.artist}
                    </p>
                  )}
                </div>
              </div>

              {/* Lyrics */}
              <div style={{ paddingLeft: '2rem' }}>
                {sections.length > 0 ? (
                  sections.map((sec, si) => (
                    <div key={si} style={{ marginBottom: '0.6rem' }}>
                      {sec.label && (
                        <p className="section-label">{sec.label}</p>
                      )}
                      <p style={{ lineHeight: 1.75, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                        {sec.lines.join('\n').trim()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#bbb', fontSize: '0.8rem', fontStyle: 'italic', fontFamily: 'Arial, sans-serif' }}>
                    No lyrics saved for this song
                  </p>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Footer ────────────────────────────── */}
        <div style={{ borderTop: '1px solid #e0e0e0', marginTop: '1rem', paddingTop: '0.75rem', textAlign: 'center' }}>
          <p style={{ color: '#ccc', fontSize: '0.7rem', fontFamily: 'Arial, sans-serif' }}>
            SongSaver &nbsp;·&nbsp; {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </>
  )
}
