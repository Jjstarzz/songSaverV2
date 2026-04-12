'use client'

import { useState, useEffect } from 'react'
import { Globe, Plus, Pencil, Check, X, ClipboardPaste, Eye, Search } from 'lucide-react'
import { SongLyrics, LANGUAGE_NAMES } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Select, Textarea } from '@/components/ui/Input'
import { useSupabase } from '@/hooks/useSupabase'
import { toast } from '@/components/ui/Toaster'
import { parseLyrics, normaliseLyrics } from '@/lib/parseLyrics'
import { cn } from '@/lib/utils'
import { LyricsSearch } from './LyricsSearch'

interface LyricsViewerProps {
  songId: string
  lyrics: SongLyrics[]
  onUpdate?: () => void
  isOwner?: boolean
}

const SUPPORTED_LANGUAGES = Object.entries(LANGUAGE_NAMES).map(([value, label]) => ({
  value,
  label,
}))

/** Renders raw lyrics text with [Section] labels styled as headers. */
function LyricsDisplay({ text }: { text: string }) {
  const sections = parseLyrics(text)
  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <div key={i}>
          {section.label && (
            <p className="text-[10px] font-bold tracking-widest uppercase text-accent-400/80 mb-1.5">
              {section.label}
            </p>
          )}
          <p className="lyrics-text">{section.content}</p>
        </div>
      ))}
    </div>
  )
}

export function LyricsViewer({ songId, lyrics, onUpdate, isOwner = true }: LyricsViewerProps) {
  const supabase = useSupabase()
  const [activeLang, setActiveLang] = useState<string>('')
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [adding, setAdding] = useState(false)
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [newLang, setNewLang] = useState('en')
  const [saving, setSaving] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    if (lyrics.length > 0 && !activeLang) {
      const defaultLyric = lyrics.find((l) => l.is_default) ?? lyrics[0]
      setActiveLang(defaultLyric.language)
    }
  }, [lyrics, activeLang])

  const activeLyric = lyrics.find((l) => l.language === activeLang)

  const startEdit = () => {
    setEditText(activeLyric?.lyrics ?? '')
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditText('')
  }

  const saveLyrics = async () => {
    if (!activeLyric) return
    setSaving(true)
    // Normalise section labels before saving
    const cleaned = normaliseLyrics(parseLyrics(editText))
    const { error } = await supabase
      .from('song_lyrics')
      .update({ lyrics: cleaned })
      .eq('id', activeLyric.id)

    if (error) {
      toast.error('Failed to save lyrics')
    } else {
      toast.success('Lyrics saved')
      setEditing(false)
      onUpdate?.()
    }
    setSaving(false)
  }

  const addLanguage = async () => {
    const rawText = pasteMode ? pasteText : editText
    if (!rawText.trim()) { toast.error('Please enter lyrics'); return }
    setSaving(true)
    const cleaned = normaliseLyrics(parseLyrics(rawText))
    const { error } = await supabase.from('song_lyrics').insert({
      song_id: songId,
      language: newLang,
      lyrics: cleaned,
      is_default: lyrics.length === 0,
    })

    if (error) {
      toast.error(error.message.includes('unique') ? 'This language already exists' : 'Failed to add lyrics')
    } else {
      toast.success('Lyrics added')
      setAdding(false)
      setPasteText('')
      setEditText('')
      setPasteMode(false)
      setShowPreview(false)
      setActiveLang(newLang)
      onUpdate?.()
    }
    setSaving(false)
  }

  const setAsDefault = async () => {
    if (!activeLyric) return
    await supabase.from('song_lyrics').update({ is_default: false }).eq('song_id', songId)
    const { error } = await supabase
      .from('song_lyrics')
      .update({ is_default: true })
      .eq('id', activeLyric.id)
    if (!error) { toast.success('Default language updated'); onUpdate?.() }
  }

  const openAdding = () => {
    setAdding(true)
    setPasteMode(true) // default to paste mode for adding
    setShowPreview(false)
    setSearchOpen(false)
    setPasteText('')
    setEditText('')
  }

  const availableNewLangs = SUPPORTED_LANGUAGES.filter(
    (l) => !lyrics.some((ly) => ly.language === l.value)
  )

  return (
    <div className="space-y-4">
      {/* Language switcher */}
      {lyrics.length > 0 && (
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[var(--fg-subtle)] shrink-0" />
          <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
            {lyrics.map((lyric) => (
              <button
                key={lyric.language}
                onClick={() => { setActiveLang(lyric.language); setEditing(false) }}
                className={cn(
                  'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                  activeLang === lyric.language
                    ? 'bg-accent-600 border-accent-500 text-white'
                    : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]'
                )}
              >
                {LANGUAGE_NAMES[lyric.language] ?? lyric.language.toUpperCase()}
                {lyric.is_default && <span className="ml-1 opacity-60">★</span>}
              </button>
            ))}
          </div>
          {isOwner && (
            <Button variant="ghost" size="icon-sm" onClick={openAdding} title="Add language">
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Add language form */}
      {adding && (
        <div className="glass-card p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--fg)]">Add Lyrics</p>
            <div className="flex items-center gap-2">
              {!searchOpen && (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-accent-400 hover:text-accent-300 bg-accent-500/10 hover:bg-accent-500/20 transition-colors border border-accent-500/20"
                >
                  <Search className="w-3.5 h-3.5" />
                  Find Lyrics
                </button>
              )}
              {!searchOpen && (
                <div className="flex gap-1 p-0.5 bg-[var(--bg-input)] rounded-lg border border-[var(--border)]">
                  <button
                    onClick={() => { setPasteMode(true); setShowPreview(false) }}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                      pasteMode ? 'bg-accent-600 text-white' : 'text-[var(--fg-muted)]'
                    )}
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 inline mr-1" />
                    Paste
                  </button>
                  <button
                    onClick={() => setPasteMode(false)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                      !pasteMode ? 'bg-accent-600 text-white' : 'text-[var(--fg-muted)]'
                    )}
                  >
                    Manual
                  </button>
                </div>
              )}
            </div>
          </div>

          {searchOpen ? (
            <LyricsSearch
              onFound={(lyrics, _title, _artist) => {
                setPasteText(lyrics)
                setPasteMode(true)
                setSearchOpen(false)
              }}
              onClose={() => setSearchOpen(false)}
            />
          ) : (
            <>
              <Select
                label="Language"
                value={newLang}
                onChange={(e) => setNewLang(e.target.value)}
                options={availableNewLangs.length > 0 ? availableNewLangs : SUPPORTED_LANGUAGES}
              />

              {pasteMode ? (
                <div className="space-y-2">
                  <Textarea
                    label="Paste lyrics here"
                    value={pasteText}
                    onChange={(e) => { setPasteText(e.target.value); setShowPreview(false) }}
                    placeholder={`[Verse 1]\nAmazing grace how sweet the sound\nThat saved a wretch like me\n\n[Chorus]\nMy chains are gone\nI've been set free`}
                    rows={10}
                    className="font-mono text-sm leading-relaxed"
                  />
                  {pasteText.trim() && (
                    <button
                      onClick={() => setShowPreview((v) => !v)}
                      className="flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {showPreview ? 'Hide preview' : 'Preview sections'}
                    </button>
                  )}
                  {showPreview && pasteText.trim() && (
                    <div className="glass-card p-4 animate-fade-in">
                      <p className="section-label mb-3">Preview</p>
                      <LyricsDisplay text={pasteText} />
                    </div>
                  )}
                </div>
              ) : (
                <Textarea
                  label="Lyrics"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Enter lyrics..."
                  rows={10}
                  className="font-mono text-sm leading-relaxed"
                />
              )}

              <p className="text-[10px] text-[var(--fg-subtle)]">
                Tip: Use <span className="font-mono bg-[var(--bg-input)] px-1 rounded">[Verse 1]</span>,{' '}
                <span className="font-mono bg-[var(--bg-input)] px-1 rounded">[Chorus]</span>,{' '}
                <span className="font-mono bg-[var(--bg-input)] px-1 rounded">[Bridge]</span> labels to organise sections.
              </p>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setAdding(false); setPasteText(''); setEditText('') }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={addLanguage} loading={saving}>
                  Save Lyrics
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Lyrics display / edit */}
      {!adding && (
        <>
          {activeLyric ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="section-label">
                  {LANGUAGE_NAMES[activeLyric.language] ?? activeLyric.language.toUpperCase()} lyrics
                </span>
                {isOwner && (
                  <div className="flex gap-1.5">
                    {!activeLyric.is_default && (
                      <Button variant="ghost" size="sm" onClick={setAsDefault} className="text-xs">
                        Set default
                      </Button>
                    )}
                    {!editing ? (
                      <Button variant="ghost" size="icon-sm" onClick={startEdit}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon-sm" onClick={cancelEdit} disabled={saving}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon-sm" onClick={saveLyrics} loading={saving}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {editing ? (
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[320px] font-mono text-sm leading-relaxed"
                  placeholder="Enter lyrics..."
                />
              ) : (
                <div className="glass-card p-5">
                  <LyricsDisplay text={activeLyric.lyrics} />
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-8 text-center space-y-3">
              <Globe className="w-8 h-8 text-[var(--fg-subtle)] mx-auto" />
              <p className="text-sm text-[var(--fg-muted)]">No lyrics added yet</p>
              {isOwner && (
                <Button variant="outline" size="sm" onClick={openAdding}>
                  <Plus className="w-4 h-4" />
                  Add Lyrics
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {lyrics.length === 0 && !adding && isOwner && (
        <Button variant="outline" onClick={openAdding} className="w-full">
          <Plus className="w-4 h-4" />
          Add Lyrics
        </Button>
      )}
    </div>
  )
}
