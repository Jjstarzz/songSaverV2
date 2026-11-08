'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Youtube, Music, Globe, ChevronDown, ChevronUp, Search, Camera, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { MUSICAL_KEYS, LANGUAGE_NAMES, Song } from '@/types/database'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/components/ui/Toaster'
import { parseLyrics, normaliseLyrics } from '@/lib/parseLyrics'
import { resizeImage } from '@/lib/resizeImage'
import { cn, goBack } from '@/lib/utils'
import { LyricsSearch } from './LyricsSearch'
import { BackHeader } from '@/components/layout/PageHeader'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'

const PRESET_TAGS = ['Praise', 'Worship', 'Fast', 'Slow', 'Thanksgiving', 'Easter', 'Christmas', 'Advent', 'Communion', 'Offering', 'Opening', 'Closing']
const TIME_SIGS = ['4/4', '3/4', '6/8', '2/4', '12/8']
const LANG_OPTIONS = Object.entries(LANGUAGE_NAMES).map(([value, label]) => ({ value, label }))


interface LyricEntry {
  language: string
  lyrics: string
  is_default: boolean
}

interface SongFormProps {
  song?: Song
  /** Page heading shown in the toolbar ("New song" / "Edit song") */
  heading?: string
}

export function SongForm({ song, heading }: SongFormProps) {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: song?.title ?? '',
    artist: song?.artist ?? '',
    default_key: song?.default_key ?? '',
    preferred_key: song?.preferred_key ?? '',
    bpm: song?.bpm?.toString() ?? '',
    time_signature: song?.time_signature ?? '4/4',
    mode: (song?.mode ?? '') as '' | 'major' | 'minor',
    youtube_url: song?.youtube_url ?? '',
    spotify_url: song?.spotify_url ?? '',
    notes: song?.notes ?? '',
    original_language: song?.original_language ?? '',
    verseview_number: song?.verseview_number?.toString() ?? '',
  })
  const [tags, setTags] = useState<string[]>(song?.tags ?? [])
  const [tagInput, setTagInput] = useState('')

  // Lyrics state — one entry per language
  const [lyricEntries, setLyricEntries] = useState<LyricEntry[]>([
    { language: 'en', lyrics: '', is_default: true },
  ])
  const [showLyricsSection, setShowLyricsSection] = useState(true)
  const [searchIdx, setSearchIdx] = useState<number | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrIdx, setOcrIdx] = useState<number | null>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)

  const triggerOcr = (idx: number) => { setOcrIdx(idx); imgInputRef.current?.click() }

  const handleOcrImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || ocrIdx === null) return
    e.target.value = ''
    setOcrLoading(true)
    try {
      const { base64, mediaType } = await resizeImage(file)
      const res = await fetch('/api/ocr-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType, mode: 'lyrics-only' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'OCR failed')
      updateLyric(ocrIdx, 'lyrics', data.lyrics)
      toast.success('Lyrics extracted from image')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to extract lyrics')
    }
    setOcrLoading(false)
    setOcrIdx(null)
  }

  // ── Unsaved-changes tracking ──
  const snapshot = (fm: typeof form, tg: string[], le: LyricEntry[]) => JSON.stringify({ fm, tg, le })
  const initialRef = useRef<string | null>(null)
  if (initialRef.current === null) initialRef.current = snapshot(form, tags, lyricEntries)
  const [saved, setSaved] = useState(false)
  const dirty = useMemo(() => !saved && snapshot(form, tags, lyricEntries) !== initialRef.current, [form, tags, lyricEntries, saved])
  const { guard, dialog: leaveDialog } = useUnsavedChanges(dirty)

  // ── Inline validation ──
  const [errors, setErrors] = useState<{ title?: string; bpm?: string }>({})
  const validate = () => {
    const next: { title?: string; bpm?: string } = {}
    if (!form.title.trim()) next.title = 'Enter the song title'
    const b = form.bpm ? parseInt(form.bpm, 10) : null
    if (b !== null && (!Number.isFinite(b) || b <= 0 || b >= 400)) next.bpm = 'BPM must be between 1 and 399'
    setErrors(next)
    return next
  }

  const keyOptions = [
    { value: '', label: '— Select key —' },
    ...MUSICAL_KEYS.map((k) => ({ value: k, label: k })),
  ]
  const timeSigOptions = TIME_SIGS.map((t) => ({ value: t, label: t }))

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const addTag = (tag: string) => {
    const cleaned = tag.trim()
    if (!cleaned || tags.includes(cleaned)) return
    setTags((prev) => [...prev, cleaned])
    setTagInput('')
  }
  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

  const addLyricTab = () => {
    const used = lyricEntries.map((e) => e.language)
    const next = LANG_OPTIONS.find((l) => !used.includes(l.value))
    if (!next) return
    setLyricEntries((prev) => [...prev, { language: next.value, lyrics: '', is_default: false }])
  }

  const removeLyricTab = (idx: number) => {
    setLyricEntries((prev) => {
      const updated = prev.filter((_, i) => i !== idx)
      // Ensure one default
      if (updated.length > 0 && !updated.some((e) => e.is_default)) {
        return updated.map((e, i) => (i === 0 ? { ...e, is_default: true } : e))
      }
      return updated
    })
  }

  const updateLyric = (idx: number, field: keyof LyricEntry, value: string | boolean) => {
    setLyricEntries((prev) =>
      prev.map((entry, i) => {
        if (i === idx) return { ...entry, [field]: value }
        if (field === 'is_default' && value === true) return { ...entry, is_default: false }
        return entry
      })
    )
  }

  const updateLyricLang = (idx: number, lang: string) => {
    setLyricEntries((prev) =>
      prev.map((entry, i) => (i === idx ? { ...entry, language: lang } : entry))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const problems = validate()
    if (problems.title || problems.bpm) {
      // Move focus to the first field that needs attention
      document.getElementById(problems.title ? 'song-title' : 'song-bpm')?.focus()
      return
    }
    const bpm = form.bpm ? parseInt(form.bpm, 10) : null

    setLoading(true)

    const payload = {
      title: form.title.trim(),
      artist: form.artist.trim() || null,
      default_key: form.default_key || null,
      preferred_key: form.preferred_key || null,
      bpm,
      time_signature: form.time_signature || null,
      mode: (form.mode || null) as 'major' | 'minor' | null,
      youtube_url: form.youtube_url.trim() || null,
      spotify_url: form.spotify_url.trim() || null,
      notes: form.notes.trim() || null,
      original_language: form.original_language || null,
      verseview_number: form.verseview_number ? parseInt(form.verseview_number, 10) || null : null,
      tags,
    }

    if (song) {
      const { error } = await supabase.from('songs').update(payload).eq('id', song.id)
      if (error) { toast.error('Failed to update song'); setLoading(false); return }
      toast.success('Song updated')
      setSaved(true)
      router.push(`/songs/${song.id}`)
    } else {
      const { data, error } = await supabase
        .from('songs')
        .insert({ ...payload, created_by: user.id })
        .select()
        .single()

      if (error) { toast.error('Failed to create song'); setLoading(false); return }

      // Save any lyrics that were filled in (normalise section labels)
      const lyricsToSave = lyricEntries.filter((e) => e.lyrics.trim())
      if (lyricsToSave.length > 0) {
        const { error: lyricsError } = await supabase.from('song_lyrics').insert(
          lyricsToSave.map((e) => ({
            song_id: data.id,
            language: e.language,
            lyrics: normaliseLyrics(parseLyrics(e.lyrics)),
            is_default: e.is_default,
          }))
        )
        if (lyricsError) {
          // The song itself saved — send the user to it so they can re-add lyrics.
          toast.error('Song created, but lyrics failed to save')
          setSaved(true)
          router.push(`/songs/${data.id}`)
          return
        }
      }

      toast.success('Song created')
      setSaved(true)
      router.push(`/songs/${data.id}`)
    }
  }

  return (
    <>
    {heading && (
      <BackHeader title={heading}>
        <Button variant="ghost" size="icon" type="button" onClick={() => guard(() => goBack(router, song ? `/songs/${song.id}` : '/songs'))} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </BackHeader>
    )}
    {leaveDialog}
    <form onSubmit={handleSubmit} noValidate className="px-4 pt-6 max-w-2xl space-y-8">
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" aria-hidden tabIndex={-1} onChange={handleOcrImage} />
      <p className="text-sm text-[var(--fg-muted)]">Fields marked <span aria-hidden className="text-[var(--danger)]">*</span><span className="sr-only">with an asterisk</span> are required.</p>

      {/* ── Basic Info ── */}
      <section aria-labelledby="sf-basic" className="space-y-4">
        <h2 id="sf-basic" className="text-base font-semibold text-[var(--fg)]">Basic info</h2>
        <Input
          id="song-title"
          label="Song title *"
          value={form.title}
          onChange={(e) => { set('title', e.target.value); if (errors.title) setErrors((x) => ({ ...x, title: undefined })) }}
          onBlur={() => { if (!form.title.trim()) setErrors((x) => ({ ...x, title: 'Enter the song title' })) }}
          placeholder="Amazing Grace"
          required
          aria-required="true"
          error={errors.title}
        />
        <Input
          label="Artist / Band"
          value={form.artist}
          onChange={(e) => set('artist', e.target.value)}
          placeholder="Chris Tomlin"
        />
        <Select
          label="Original Language"
          value={form.original_language}
          onChange={(e) => set('original_language', e.target.value)}
          options={[{ value: '', label: '— Select language —' }, ...LANG_OPTIONS]}
        />
      </section>

      {/* ── Lyrics ── */}
      {!song && (
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setShowLyricsSection((v) => !v)}
            aria-expanded={showLyricsSection}
            className="flex items-center justify-between w-full min-h-[44px]"
          >
            <h2 className="text-base font-semibold text-[var(--fg)] flex items-center gap-2">
              <Globe aria-hidden className="w-4 h-4 text-[var(--fg-subtle)]" />
              Lyrics
              <span className="text-[var(--fg-subtle)] font-normal text-sm">(optional)</span>
            </h2>
            {showLyricsSection
              ? <ChevronUp className="w-4 h-4 text-white/30" />
              : <ChevronDown className="w-4 h-4 text-white/30" />}
          </button>

          {showLyricsSection && (
            <div className="space-y-4 animate-fade-in">
              {/* Language tabs */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                {lyricEntries.map((entry, idx) => (
                  <div key={idx} className="flex items-center shrink-0">
                    <button
                      type="button"
                      className={cn(
                        'px-3 py-1.5 rounded-l-lg text-xs font-medium border-y border-l transition-all duration-200',
                        entry.is_default
                          ? 'bg-accent-600 border-accent-500 text-white'
                          : 'bg-white/[0.06] border-white/10 text-white/60'
                      )}
                      onClick={() => updateLyric(idx, 'is_default', true)}
                    >
                      {LANGUAGE_NAMES[entry.language] ?? entry.language.toUpperCase()}
                      {entry.is_default && <span className="ml-1 opacity-70">★</span>}
                    </button>
                    {lyricEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLyricTab(idx)}
                        className="px-1.5 py-1.5 rounded-r-lg text-xs border-y border-r border-white/10 bg-white/[0.06] text-white/30 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {lyricEntries.length < LANG_OPTIONS.length && (
                  <button
                    type="button"
                    onClick={addLyricTab}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-dashed border-white/20 text-white/40 hover:text-white/70 hover:border-white/30 transition-all"
                  >
                    <Plus className="w-3 h-3" /> Add language
                  </button>
                )}
              </div>

              {/* Active lyric entry */}
              {lyricEntries.map((entry, idx) => (
                <div key={idx} className={entry.is_default ? 'block space-y-2' : 'hidden'}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <Select
                        label="Language"
                        value={entry.language}
                        onChange={(e) => updateLyricLang(idx, e.target.value)}
                        options={LANG_OPTIONS.filter(
                          (l) => l.value === entry.language || !lyricEntries.some((e, i) => i !== idx && e.language === l.value)
                        )}
                      />
                    </div>
                    <div className="flex gap-1.5 mt-5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSearchIdx(searchIdx === idx ? null : idx)}
                        title="Find lyrics online"
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-accent-400 bg-accent-500/10 hover:bg-accent-500/20 transition-colors border border-accent-500/20"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerOcr(idx)}
                        disabled={ocrLoading}
                        title="Scan image for lyrics"
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-colors border border-purple-500/20 disabled:opacity-50"
                      >
                        {ocrLoading && ocrIdx === idx
                          ? <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                          : <Camera className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {searchIdx === idx ? (
                    <LyricsSearch
                      onFound={(lyrics, title, artist) => {
                        updateLyric(idx, 'lyrics', lyrics)
                        if (!form.title.trim() && title) set('title', title)
                        if (!form.artist.trim() && artist) set('artist', artist)
                        setSearchIdx(null)
                      }}
                      onClose={() => setSearchIdx(null)}
                    />
                  ) : (
                    <>
                      <Textarea
                        label="Lyrics"
                        value={entry.lyrics}
                        onChange={(e) => updateLyric(idx, 'lyrics', e.target.value)}
                        onBlur={(e) => {
                          const cleaned = normaliseLyrics(parseLyrics(e.target.value))
                          if (cleaned !== e.target.value) updateLyric(idx, 'lyrics', cleaned)
                        }}
                        placeholder={`[Verse 1]\nAmazing grace how sweet the sound\nThat saved a wretch like me\n\n[Chorus]\nMy chains are gone\nI've been set free`}
                        rows={10}
                        className="font-mono text-sm leading-relaxed"
                      />
                      <p className="text-[10px] text-white/30 -mt-1">
                        Use <span className="font-mono bg-white/10 px-1 rounded">[Verse 1]</span>,{' '}
                        <span className="font-mono bg-white/10 px-1 rounded">[Chorus]</span>,{' '}
                        <span className="font-mono bg-white/10 px-1 rounded">[Bridge]</span> labels — or just paste and sections auto-detect.
                      </p>
                    </>
                  )}
                </div>
              ))}

              <p className="text-xs text-white/30">
                Add each language as its own tab here — or add and edit languages any time later from the song page.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── Musical Details ── */}
      <section aria-labelledby="sf-music" className="space-y-4">
        <h2 id="sf-music" className="text-base font-semibold text-[var(--fg)]">Musical details</h2>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Default Key"
            value={form.default_key}
            onChange={(e) => set('default_key', e.target.value)}
            options={keyOptions}
          />
          <Select
            label="Preferred Key"
            value={form.preferred_key}
            onChange={(e) => set('preferred_key', e.target.value)}
            options={keyOptions}
          />
        </div>

        {/* Mode: Major / Minor */}
        <div role="radiogroup" aria-labelledby="sf-mode">
          <p id="sf-mode" className="block text-sm font-medium text-[var(--fg-muted)] mb-1.5">Mode</p>
          <div className="flex gap-2">
            {([['', 'Not set'], ['major', 'Major'], ['minor', 'Minor']] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                role="radio"
                aria-checked={form.mode === val}
                onClick={() => set('mode', val)}
                className={cn(
                  'flex-1 min-h-[44px] rounded-xl text-sm font-medium border transition-colors',
                  form.mode === val
                    ? val === 'minor'
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : val === 'major'
                      ? 'bg-accent-600 border-accent-500 text-white'
                      : 'bg-white/10 border-white/20 text-white'
                    : 'bg-white/[0.04] border-white/10 text-white/50 hover:bg-white/[0.08]'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="song-bpm"
            label="Tempo (BPM)"
            type="number"
            inputMode="numeric"
            min={40}
            max={300}
            value={form.bpm}
            onChange={(e) => { set('bpm', e.target.value); if (errors.bpm) setErrors((x) => ({ ...x, bpm: undefined })) }}
            onBlur={() => validate()}
            placeholder="120"
            error={errors.bpm}
          />
          <Select
            label="Time Signature"
            value={form.time_signature}
            onChange={(e) => set('time_signature', e.target.value)}
            options={timeSigOptions}
          />
        </div>
        <Input
          label="VerseView Number"
          type="number"
          min={1}
          value={form.verseview_number}
          onChange={(e) => set('verseview_number', e.target.value)}
          placeholder="e.g. 142"
        />
      </section>

      {/* ── Optional extras ── */}
      <details className="group surface p-4" open={!!song && (tags.length > 0 || !!form.youtube_url || !!form.spotify_url || !!form.notes)}>
        <summary className="flex items-center justify-between cursor-pointer list-none min-h-[44px] -m-1 p-1 rounded-lg">
          <span>
            <span className="block text-base font-semibold text-[var(--fg)]">More details <span className="font-normal text-sm text-[var(--fg-subtle)]">(optional)</span></span>
            <span className="block text-sm text-[var(--fg-muted)]">Tags, YouTube / Spotify links and notes</span>
          </span>
          <ChevronDown aria-hidden className="w-5 h-5 text-[var(--fg-subtle)] transition-transform group-open:rotate-180" />
        </summary>
        <div className="pt-5 space-y-8">
      <section aria-labelledby="sf-tags" className="space-y-3">
        <h3 id="sf-tags" className="text-sm font-semibold text-[var(--fg)]">Tags</h3>
        <div className="flex gap-2 flex-wrap">
          {PRESET_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => tags.includes(tag) ? removeTag(tag) : addTag(tag)}
              aria-pressed={tags.includes(tag)}
              className={cn(
                'min-h-[36px] px-3 rounded-full text-sm font-medium border transition-colors',
                tags.includes(tag)
                  ? 'bg-accent-600 border-accent-500 text-white'
                  : 'bg-white/[0.06] border-white/10 text-white/60 hover:bg-white/[0.10]'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
            placeholder="Add custom tag..."
            aria-label="Custom tag"
            className="input-base flex-1"
          />
          <Button type="button" variant="secondary" size="icon" onClick={() => addTag(tagInput)} aria-label="Add custom tag">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {tags.map((tag) => (
              <span key={tag} className="tag-pill gap-1.5">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`} className="w-6 h-6 -mr-1 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)]">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Links ── */}
      <section aria-labelledby="sf-links" className="space-y-4">
        <h3 id="sf-links" className="text-sm font-semibold text-[var(--fg)]">Links</h3>
        <Input
          label="YouTube URL"
          type="url"
          value={form.youtube_url}
          onChange={(e) => set('youtube_url', e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          leftIcon={<Youtube className="w-4 h-4" />}
        />
        <Input
          label="Spotify URL"
          type="url"
          value={form.spotify_url}
          onChange={(e) => set('spotify_url', e.target.value)}
          placeholder="https://open.spotify.com/track/..."
          leftIcon={<Music className="w-4 h-4" />}
        />
      </section>

      {/* ── Notes ── */}
      <section aria-labelledby="sf-notes" className="space-y-3">
        <h3 id="sf-notes" className="text-sm font-semibold text-[var(--fg)]">Notes</h3>
        <Textarea
          label="Song Notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Arrangement notes, intro cues, special instructions..."
          rows={4}
        />
      </section>

        </div>
      </details>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={() => guard(() => goBack(router, song ? `/songs/${song.id}` : '/songs'))} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          {loading ? 'Saving…' : song ? 'Save changes' : 'Add song'}
        </Button>
      </div>
      {Object.values(errors).some(Boolean) && (
        <p role="alert" className="text-sm text-[var(--danger)]">Please fix the highlighted fields.</p>
      )}
    </form>
    </>
  )
}
