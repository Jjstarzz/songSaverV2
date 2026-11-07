'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, Download, Loader2, Printer, RotateCcw } from 'lucide-react'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import {
  buildPdfModel, songParts, DEFAULT_PDF_OPTIONS, PDF_FONT_PT,
  type PdfOptions, type PdfSection, type PdfSourceService, type PdfSourceSong,
} from '@/lib/servicePdf'
import { cn } from '@/lib/utils'

const OPTIONS_KEY = 'songsaver-pdf-options'
const excludedKey = (serviceId: string) => `songsaver-pdf-excluded-${serviceId}`

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

/* ─── Small controls ─────────────────────────── */

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 cursor-pointer">
      <span className="min-w-0">
        <span className="block text-sm text-[var(--fg)]">{label}</span>
        {hint && <span className="block text-xs text-[var(--fg-subtle)]">{hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'relative w-10 h-6 rounded-full shrink-0 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500',
          checked ? 'bg-accent-600' : 'bg-[var(--border)]'
        )}
      >
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </label>
  )
}

function Segmented<T extends string | number>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <div className="py-2">
      <p className="text-sm text-[var(--fg)] mb-1.5">{label}</p>
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-input)] border border-[var(--border)]" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              value === o.value ? 'bg-accent-600 text-white shadow-sm' : 'text-[var(--fg-muted)]'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Preview (mirrors ServicePdfDoc) ────────── */

function PreviewSection({ sec, opts }: { sec: PdfSection; opts: PdfOptions }) {
  if (sec.repeatOf) {
    return (
      <p className="pv-repeat">
        {sec.label ?? 'Repeat'}
        {sec.label && sec.repeatOf !== sec.label ? ` — as ${sec.repeatOf}` : ''} (repeat)
      </p>
    )
  }
  return (
    <div className="pv-section">
      {opts.showSectionLabels && sec.label && <p className="pv-label">{sec.label}</p>}
      <p className="pv-lines">{sec.text}</p>
      {sec.translation && <p className="pv-trans">{sec.translation}</p>}
    </div>
  )
}

/* ─── Page ───────────────────────────────────── */

export default function PrintPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = useSupabase()
  const { user, loading: authLoading } = useAuth()

  const [service, setService] = useState<PdfSourceService | null>(null)
  const [songs, setSongs] = useState<PdfSourceSong[]>([])
  const [userKeys, setUserKeys] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [opts, setOpts] = useState<PdfOptions>(DEFAULT_PDF_OPTIONS)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [openSong, setOpenSong] = useState<number | null>(null)

  // Saved preferences (after mount — localStorage isn't available during SSR)
  useEffect(() => {
    setOpts(loadJSON(OPTIONS_KEY, DEFAULT_PDF_OPTIONS))
    try {
      const raw = localStorage.getItem(excludedKey(id))
      if (raw) setExcluded(new Set(JSON.parse(raw) as string[]))
    } catch { /* ignore */ }
  }, [id])

  const updateOpts = (patch: Partial<PdfOptions>) => {
    setOpts((prev) => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const updateExcluded = (fn: (s: Set<string>) => void) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      fn(next)
      try { localStorage.setItem(excludedKey(id), JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  useEffect(() => {
    if (!user) return
    async function load() {
      const [{ data: svc, error }, { data: svcSongs }] = await Promise.all([
        supabase.from('services').select('date, type, theme, notes').eq('id', id).single(),
        supabase
          .from('service_songs')
          .select('order_index, key_override, songs(id, title, artist, default_key, mode, song_lyrics(lyrics, language, is_default))')
          .eq('service_id', id)
          .order('order_index', { ascending: true }),
      ])
      if (error || !svc) { setLoadError(true); setReady(true); return }
      setService(svc as unknown as PdfSourceService)
      const list = ((svcSongs ?? []) as unknown as PdfSourceSong[]).filter((s) => s.songs)
      setSongs(list)

      const songIds = list.map((s) => s.songs.id)
      if (songIds.length) {
        const { data: prefs } = await supabase
          .from('user_song_preferences')
          .select('song_id, preferred_key')
          .eq('user_id', user!.id)
          .in('song_id', songIds)
        const map: Record<string, string> = {}
        ;(prefs ?? []).forEach((p: { song_id: string; preferred_key: string | null }) => {
          if (p.preferred_key) map[p.song_id] = p.preferred_key
        })
        setUserKeys(map)
      }
      setReady(true)
    }
    load()
  }, [user, supabase, id])

  // Hide the app's bottom nav and width limit on this page
  useEffect(() => {
    const nav = document.querySelector('.bottom-nav') as HTMLElement | null
    const wrap = document.getElementById('app-shell')
    if (nav) nav.style.display = 'none'
    if (wrap) { wrap.style.maxWidth = 'none'; wrap.style.paddingBottom = '0' }
    return () => {
      if (nav) nav.style.display = ''
      if (wrap) { wrap.style.maxWidth = ''; wrap.style.paddingBottom = '' }
    }
  }, [])

  const partsBySong = useMemo(() => songs.map((s) => songParts(s.songs)), [songs])

  const model = useMemo(
    () => (service ? buildPdfModel(service, songs, userKeys, opts, excluded) : null),
    [service, songs, userKeys, opts, excluded]
  )

  const downloadPdf = async () => {
    if (!model) return
    setDownloading(true)
    try {
      const { generateServicePdf } = await import('./ServicePdfDoc')
      const blob = await generateServicePdf(model, opts)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${model.title.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'service'}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      setDownloading(false)
    }
  }

  if (authLoading || !ready) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-accent-400 animate-spin" />
        <p className="text-sm text-[var(--fg-muted)]">Preparing document…</p>
      </div>
    )
  }

  if (loadError || !service || !model) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[var(--fg-muted)]">This service couldn&apos;t be loaded.</p>
        <button onClick={() => router.back()} className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm">Go back</button>
      </div>
    )
  }

  const includedSongs = songs.length - songs.filter((_, i) => excluded.has(String(i))).length
  const basePt = PDF_FONT_PT[opts.fontSize]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .pv-sheet { --pv: ${basePt}px; font-family: 'Noto Sans', system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1a1a1a; background: #fff; }
        .pv-sheet .pv-eyebrow { font-size: 0.68em; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #6d28d9; }
        .pv-sheet .pv-title { font-size: calc(var(--pv) * 1.9); font-weight: 700; line-height: 1.15; margin-top: 4px; }
        .pv-sheet .pv-meta { font-size: calc(var(--pv) * 0.82); color: #666; margin-top: 4px; }
        .pv-sheet .pv-notes { font-size: calc(var(--pv) * 0.82); color: #555; margin-top: 8px; padding: 8px 10px; background: #f6f4fb; border-radius: 4px; white-space: pre-wrap; }
        .pv-sheet .pv-rule { border-bottom: 1.5px solid #1a1a1a; margin: 12px 0 16px; }
        .pv-sheet .pv-song { margin-bottom: calc(var(--pv) * 1.4); font-size: var(--pv); }
        .pv-sheet .pv-song-head { display: flex; align-items: center; gap: 8px; padding-bottom: 5px; margin-bottom: calc(var(--pv) * 0.6); border-bottom: 0.5px solid #e2e2e2; break-after: avoid; }
        .pv-sheet .pv-num { width: 1.8em; height: 1.8em; border-radius: 50%; background: #6d28d9; color: #fff; font-size: 0.8em; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pv-sheet .pv-song-title { font-size: 1.25em; font-weight: 700; line-height: 1.2; }
        .pv-sheet .pv-artist { font-size: 0.8em; color: #777; }
        .pv-sheet .pv-key { margin-left: auto; font-size: 0.78em; font-weight: 700; color: #6d28d9; background: #efe9fd; padding: 2px 6px; border-radius: 3px; white-space: nowrap; }
        .pv-sheet .pv-cols { display: grid; grid-template-columns: 1fr 1fr; column-gap: 18px; }
        .pv-sheet .pv-section { margin-bottom: calc(var(--pv) * 0.75); break-inside: avoid; }
        .pv-sheet .pv-label { font-size: 0.68em; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6d28d9; margin-bottom: 2px; }
        .pv-sheet .pv-lines { white-space: pre-wrap; line-height: 1.6; }
        .pv-sheet .pv-trans { white-space: pre-wrap; font-size: 0.88em; color: #555; line-height: 1.55; margin-top: 3px; padding-left: 7px; border-left: 1.5px solid #d4c3fb; }
        .pv-sheet .pv-repeat { font-size: 0.85em; color: #888; margin-bottom: calc(var(--pv) * 0.75); }
        .pv-sheet .pv-empty { font-size: 0.85em; color: #aaa; }
        .pv-sheet .pv-page-break { break-before: page; }
        @media print {
          @page { size: A4; margin: 15mm 17mm; }
          html, body { background: #fff !important; }
          .no-print, .bottom-nav { display: none !important; }
          .print-shell { display: block !important; padding: 0 !important; }
          .pv-paper { box-shadow: none !important; padding: 0 !important; max-width: none !important; border-radius: 0 !important; }
        }
      ` }} />

      {/* Top bar */}
      <header className="no-print sticky-header-bg sticky top-0 z-40 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 px-3 py-2 max-w-6xl mx-auto">
          <button onClick={() => router.back()} aria-label="Back" className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--fg-muted)] hover:bg-[var(--bg-input)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-[var(--fg-subtle)]">Print / PDF</p>
            <h1 className="text-sm font-semibold text-[var(--fg)] truncate">{model.title}</h1>
          </div>
          <div className="hidden md:flex gap-2">
            <button onClick={() => window.print()} className="h-10 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm font-medium text-[var(--fg)] flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={downloadPdf} disabled={downloading} className="h-10 px-4 rounded-xl bg-accent-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? 'Creating PDF…' : 'Download PDF'}
            </button>
          </div>
        </div>
      </header>

      <div className="print-shell md:grid md:grid-cols-[360px_1fr] gap-6 max-w-6xl mx-auto px-4 py-4 pb-28 md:pb-10">
        {/* ── Options ── */}
        <aside className="no-print space-y-4 md:sticky md:top-20 md:self-start md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto md:pr-1">
          <section className="glass-card p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="section-label">Songs &amp; parts</p>
              <span className="text-xs text-[var(--fg-subtle)]">{includedSongs} of {songs.length} songs</span>
            </div>
            <p className="text-xs text-[var(--fg-subtle)] mb-3">Untick songs, or open one to choose which parts to print.</p>
            <div className="space-y-1.5">
              {songs.map((item, i) => {
                const parts = partsBySong[i]
                const songOff = excluded.has(String(i))
                const partsOn = parts.filter((_, p) => !excluded.has(`${i}:${p}`)).length
                const open = openSong === i
                return (
                  <div key={i} className={cn('rounded-xl border border-[var(--border)] bg-[var(--bg-input)]', songOff && 'opacity-60')}>
                    <div className="flex items-center gap-2 pl-3 pr-1">
                      <input
                        type="checkbox"
                        checked={!songOff}
                        onChange={(e) => updateExcluded((s) => { if (e.target.checked) s.delete(String(i)); else s.add(String(i)) })}
                        aria-label={`Include ${item.songs.title}`}
                        className="w-4 h-4 accent-[#7c3aed] shrink-0"
                      />
                      <button
                        onClick={() => setOpenSong(open ? null : i)}
                        className="flex-1 min-w-0 flex items-center gap-2 py-2.5 text-left"
                        aria-expanded={open}
                      >
                        <span className="text-xs text-[var(--fg-subtle)] w-4 shrink-0">{i + 1}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-[var(--fg)] truncate">{item.songs.title}</span>
                          <span className="block text-[11px] text-[var(--fg-subtle)]">
                            {parts.length === 0 ? 'No lyrics' : partsOn === parts.length ? `All ${parts.length} parts` : `${partsOn} of ${parts.length} parts`}
                          </span>
                        </span>
                        {parts.length > 0 && <ChevronDown className={cn('w-4 h-4 text-[var(--fg-subtle)] transition-transform shrink-0', open && 'rotate-180')} />}
                      </button>
                    </div>
                    {open && parts.length > 0 && (
                      <div className="px-3 pb-3 space-y-1 animate-fade-in">
                        <div className="flex gap-3 text-xs py-1">
                          <button className="text-accent-400 font-medium" onClick={() => updateExcluded((s) => parts.forEach((_, p) => s.delete(`${i}:${p}`)))}>Select all</button>
                          <button className="text-accent-400 font-medium" onClick={() => updateExcluded((s) => parts.forEach((_, p) => s.add(`${i}:${p}`)))}>Clear</button>
                        </div>
                        {parts.map((part, p) => {
                          const on = !excluded.has(`${i}:${p}`)
                          return (
                            <label key={p} className="flex items-start gap-2.5 py-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={(e) => updateExcluded((s) => { if (e.target.checked) s.delete(`${i}:${p}`); else s.add(`${i}:${p}`) })}
                                className="w-4 h-4 mt-0.5 accent-[#7c3aed] shrink-0"
                              />
                              <span className="min-w-0">
                                <span className="block text-xs font-semibold text-[var(--fg)]">{part.label ?? `Part ${p + 1}`}</span>
                                <span className="block text-xs text-[var(--fg-subtle)] truncate">{part.preview || '(same words as before)'}</span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
              {songs.length === 0 && <p className="text-sm text-[var(--fg-subtle)] py-2">This service has no songs yet.</p>}
            </div>
          </section>

          <section className="glass-card p-4">
            <p className="section-label mb-1">Layout</p>
            <Segmented label="Text size" value={opts.fontSize} onChange={(v) => updateOpts({ fontSize: v })}
              options={[{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }]} />
            <Segmented label="Columns" value={opts.columns} onChange={(v) => updateOpts({ columns: v })}
              options={[{ value: 1, label: 'One' }, { value: 2, label: 'Two (compact)' }]} />
            <Toggle label="Each song on a new page" checked={opts.songPerPage} onChange={(v) => updateOpts({ songPerPage: v })} />
          </section>

          <section className="glass-card p-4">
            <p className="section-label mb-1">Show</p>
            <Toggle label="Keys" hint="Setlist key, then your key, then the song's" checked={opts.showKeys} onChange={(v) => updateOpts({ showKeys: v })} />
            <Toggle label="Artists" checked={opts.showArtist} onChange={(v) => updateOpts({ showArtist: v })} />
            <Toggle label="Section names" hint="Verse 1, Chorus…" checked={opts.showSectionLabels} onChange={(v) => updateOpts({ showSectionLabels: v })} />
            <Toggle label="Second language" hint="Under each section, when a song has one" checked={opts.showTranslation} onChange={(v) => updateOpts({ showTranslation: v })} />
            <Toggle label="Print repeats once" hint="Later choruses become a short “Chorus (repeat)” line" checked={opts.collapseRepeats} onChange={(v) => updateOpts({ collapseRepeats: v })} />
            <Toggle label="Service notes" checked={opts.showNotes} onChange={(v) => updateOpts({ showNotes: v })} />
            <button
              onClick={() => { updateOpts(DEFAULT_PDF_OPTIONS); updateExcluded((s) => s.clear()) }}
              className="mt-2 text-xs text-[var(--fg-subtle)] hover:text-[var(--fg-muted)] flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" /> Reset to defaults
            </button>
          </section>
        </aside>

        {/* ── Preview ── */}
        <main className="mt-6 md:mt-0">
          <p className="no-print section-label mb-2">Preview</p>
          <div className="pv-paper pv-sheet rounded-lg shadow-card mx-auto max-w-[210mm] p-[6%] md:p-12">
            <p className="pv-eyebrow">Order of worship</p>
            <h2 className="pv-title">{model.title}</h2>
            <p className="pv-meta">{model.subtitle}  ·  {model.songs.length} {model.songs.length === 1 ? 'song' : 'songs'}</p>
            {model.notes && <p className="pv-notes">{model.notes}</p>}
            <div className="pv-rule" />

            {model.songs.length === 0 && <p className="pv-empty">No songs selected.</p>}
            {model.songs.map((song, i) => (
              <div key={song.number} className={cn('pv-song', opts.songPerPage && i > 0 && 'pv-page-break')}>
                <div className="pv-song-head">
                  <span className="pv-num">{song.number}</span>
                  <div className="min-w-0">
                    <p className="pv-song-title">{song.title}</p>
                    {song.artist && <p className="pv-artist">{song.artist}</p>}
                  </div>
                  {song.keyLabel && <span className="pv-key">{song.keyLabel}</span>}
                </div>
                {song.sections.length === 0 ? (
                  <p className="pv-empty">No lyrics selected</p>
                ) : opts.columns === 2 ? (
                  <div className="pv-cols">
                    <div>{song.columns[0].map((sec, j) => <PreviewSection key={j} sec={sec} opts={opts} />)}</div>
                    <div>{song.columns[1].map((sec, j) => <PreviewSection key={j} sec={sec} opts={opts} />)}</div>
                  </div>
                ) : (
                  song.sections.map((sec, j) => <PreviewSection key={j} sec={sec} opts={opts} />)
                )}
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Mobile action bar */}
      <div className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 sticky-header-bg border-t border-[var(--border)] px-4 pt-3 flex gap-2" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <button onClick={() => window.print()} className="h-12 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm font-medium text-[var(--fg)] flex items-center gap-2">
          <Printer className="w-4 h-4" /> Print
        </button>
        <button onClick={downloadPdf} disabled={downloading} className="flex-1 h-12 rounded-xl bg-accent-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? 'Creating PDF…' : 'Download PDF'}
        </button>
      </div>
    </>
  )
}
