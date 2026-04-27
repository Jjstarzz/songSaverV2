'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Youtube, Music, Globe, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { MUSICAL_KEYS, LANGUAGE_NAMES, Song } from '@/types/database'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/components/ui/Toaster'
import { parseLyrics, normaliseLyrics } from '@/lib/parseLyrics'
import { cn } from '@/lib/utils'
import { LyricsSearch } from './LyricsSearch'

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
}

export function SongForm({ song }: SongFormProps) {
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
  })
  const [tags, setTags] = useState<string[]>(song?.tags ?? [])
  const [tagInput, setTagInput] = useState('')

  // Lyrics state — one entry per language
  const [lyricEntries, setLyricEntries] = useState<LyricEntry[]>([
    { language: 'en', lyrics: '', is_default: true },
  ])
  const [showLyricsSection, setShowLyricsSection] = useState(true)
  const [searchIdx, setSearchIdx] = useState<number | null>(null)

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
        updated[0].is_default = true
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
    if (!form.title.trim()) { toast.error('Title is required'); return }

    setLoading(true)

    const payload = {
      title: form.title.trim(),
      artist: form.artist.trim() || null,
      default_key: form.default_key || null,
      preferred_key: form.preferred_key || null,
      bpm: form.bpm ? parseInt(form.bpm) : null,
      time_signature: form.time_signature || null,
      mode: (form.mode || null) as 'major' | 'minor' | null,
      youtube_url: form.youtube_url.trim() || null,
      spotify_url: form.spotify_url.trim() || null,
      notes: form.notes.trim() || null,
      original_language: form.original_language || null,
      tags,
    }

    if (song) {
      const { error } = await supabase.from('songs').update(payload).eq('id', song.id)
      if (error) { toast.error('Failed to update song'); setLoading(false); return }
      toast.success('Song updated')
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
        await supabase.from('song_lyrics').insert(
          lyricsToSave.map((e) => ({
            song_id: data.id,
            language: e.language,
            lyrics: normaliseLyrics(parseLyrics(e.lyrics)),
            is_default: e.is_default,
          }))
        )
      }

      toast.success('Song created')
      router.push(`/songs/${data.id}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-10">

      {/* ── Basic Info ── */}
      <section className="space-y-4">
        <p className="section-label">Basic Info</p>
        <Input
          label="Song Title *"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Amazing Grace"
          required
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
            className="flex items-center justify-between w-full"
          >
            <p className="section-label flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              Lyrics
              <span className="text-white/30 normal-case font-normal tracking-normal text-xs">(optional)</span>
            </p>
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
                    <button
                      type="button"
                      onClick={() => setSearchIdx(searchIdx === idx ? null : idx)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-accent-400 hover:text-accent-300 bg-accent-500/10 hover:bg-accent-500/20 transition-colors border border-accent-500/20 shrink-0 mt-5"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Find Lyrics
                    </button>
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
                You can add more languages after saving the song.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── Musical Details ── */}
      <section className="space-y-4">
        <p className="section-label">Musical Details</p>
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
        <div>
          <p className="text-xs text-white/50 mb-2">Mode</p>
          <div className="flex gap-2">
            {([['', 'Not set'], ['major', 'Major'], ['minor', 'Minor']] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => set('mode', val)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-medium border transition-all duration-200',
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
            label="BPM"
            type="number"
            min={40}
            max={300}
            value={form.bpm}
            onChange={(e) => set('bpm', e.target.value)}
            placeholder="120"
          />
          <Select
            label="Time Signature"
            value={form.time_signature}
            onChange={(e) => set('time_signature', e.target.value)}
            options={timeSigOptions}
          />
        </div>
      </section>

      {/* ── Tags ── */}
      <section className="space-y-3">
        <p className="section-label">Tags</p>
        <div className="flex gap-2 flex-wrap">
          {PRESET_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => tags.includes(tag) ? removeTag(tag) : addTag(tag)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
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
            className="input-base flex-1"
          />
          <Button type="button" variant="secondary" size="icon" onClick={() => addTag(tagInput)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {tags.map((tag) => (
              <span key={tag} className="tag-pill gap-1.5">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-white/70 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Links ── */}
      <section className="space-y-4">
        <p className="section-label">Links</p>
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
      <section className="space-y-3">
        <p className="section-label">Notes</p>
        <Textarea
          label="Song Notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Arrangement notes, intro cues, special instructions..."
          rows={4}
        />
      </section>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          {song ? 'Save Changes' : 'Add Song'}
        </Button>
      </div>
    </form>
  )
}
