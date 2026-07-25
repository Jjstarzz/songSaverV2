'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, ImagePlus, Loader2, CheckCircle2, RotateCcw } from 'lucide-react'
import { BackHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { MUSICAL_KEYS, LANGUAGE_NAMES } from '@/types/database'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/components/ui/Toaster'
import { parseLyrics, normaliseLyrics } from '@/lib/parseLyrics'

const LANG_OPTIONS = Object.entries(LANGUAGE_NAMES).map(([value, label]) => ({ value, label }))

function resizeImage(file: File, maxSize = 1536): Promise<{ base64: string; mediaType: 'image/jpeg' }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve({ base64: canvas.toDataURL('image/jpeg', 0.9).split(',')[1], mediaType: 'image/jpeg' })
    }
    img.onerror = reject
    img.src = url
  })
}

type Step = 'pick' | 'processing' | 'review'

export default function ImportPhotoPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useAuth()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('pick')
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [language, setLanguage] = useState('en')
  const [verseviewNumber, setVerseviewNumber] = useState('')

  const processImage = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)
    setStep('processing')

    try {
      const { base64, mediaType } = await resizeImage(file)
      const res = await fetch('/api/ocr-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType, mode: 'full' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to extract content')

      setTitle(data.title ?? '')
      setArtist(data.artist ?? '')
      setLyrics(data.lyrics ?? '')
      setVerseviewNumber(data.verseview_number ? String(data.verseview_number) : '')
      setStep('review')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to process image')
      setStep('pick')
      setPreviewUrl(null)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) processImage(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file?.type.startsWith('image/')) processImage(file)
  }

  const handleSave = async () => {
    if (!user) return
    if (!title.trim()) { toast.error('Title is required'); return }

    setSaving(true)
    const { data, error } = await supabase
      .from('songs')
      .insert({
        title: title.trim(),
        artist: artist.trim() || null,
        verseview_number: verseviewNumber ? parseInt(verseviewNumber, 10) : null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error || !data) {
      toast.error('Failed to save song')
      setSaving(false)
      return
    }

    if (lyrics.trim()) {
      await supabase.from('song_lyrics').insert({
        song_id: data.id,
        language,
        lyrics: normaliseLyrics(parseLyrics(lyrics)),
        is_default: true,
      })
    }

    toast.success('Song created!')
    router.push(`/songs/${data.id}`)
  }

  return (
    <>
      <BackHeader title="Import from Photo">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </BackHeader>

      {/* Gallery picker — no capture attribute so it opens the photo library */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* Camera input — capture forces the camera directly */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-5">
        {step === 'pick' && (
          <>
            <p className="text-sm text-[var(--fg-muted)]">
              Take a photo or upload a screenshot of song lyrics — Claude will extract the title, artist, and lyrics automatically.
            </p>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="glass-card border-2 border-dashed border-accent-500/30 rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-accent-500/60 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-2xl bg-accent-500/15 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
                <ImagePlus className="w-8 h-8 text-accent-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-[var(--fg)]">Upload lyrics image</p>
                <p className="text-xs text-[var(--fg-muted)] mt-1">Tap to choose or drag & drop</p>
              </div>
            </div>

            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-500/10 border border-accent-500/25 text-accent-300 text-sm font-medium hover:bg-accent-500/20 transition-colors"
            >
              <Camera className="w-4 h-4" />
              Take a photo
            </button>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center gap-6 py-8">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Processing"
                className="w-full max-h-64 object-contain rounded-xl opacity-60"
              />
            )}
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-accent-400 animate-spin" />
              <p className="text-sm font-medium text-[var(--fg)]">Extracting song details…</p>
            </div>
            <p className="text-xs text-[var(--fg-muted)] text-center">
              Claude is reading your image and extracting the title, artist, and lyrics.
            </p>
          </div>
        )}

        {step === 'review' && (
          <>
            {/* Thumbnail */}
            {previewUrl && (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Source"
                  className="w-full max-h-48 object-contain rounded-xl opacity-70"
                />
                <button
                  onClick={() => { setStep('pick'); setPreviewUrl(null) }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center text-white/70 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Extracted — review and edit below</span>
            </div>

            <div className="glass-card p-4 space-y-4">
              <p className="section-label">Song Details</p>
              <div>
                <label className="block text-xs text-[var(--fg-muted)] mb-1.5 font-medium">Song Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Amazing Grace"
                  className="w-full bg-white/[0.06] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--fg-muted)] mb-1.5 font-medium">Artist / Band</label>
                <input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Chris Tomlin"
                  className="w-full bg-white/[0.06] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--fg-muted)] mb-1.5 font-medium">VerseView Number</label>
                <input
                  type="number"
                  min={1}
                  value={verseviewNumber}
                  onChange={(e) => setVerseviewNumber(e.target.value)}
                  placeholder="e.g. 142"
                  className="w-full bg-white/[0.06] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--fg-muted)] mb-1.5 font-medium">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-white/[0.06] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--fg)] focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30"
                >
                  {LANG_OPTIONS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="glass-card p-4 space-y-3">
              <p className="section-label">Lyrics</p>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={12}
                placeholder="Lyrics will appear here…"
                className="w-full bg-white/[0.06] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--fg)] placeholder-[var(--fg-subtle)] focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 resize-none font-mono leading-relaxed"
              />
            </div>

            <Button
              onClick={handleSave}
              loading={saving}
              className="w-full"
              size="lg"
            >
              Save Song
            </Button>

            <button
              onClick={() => { setStep('pick'); setPreviewUrl(null) }}
              className="w-full text-center text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] py-2"
            >
              Try a different image
            </button>
          </>
        )}
      </div>
    </>
  )
}
