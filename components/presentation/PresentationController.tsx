'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, EyeOff, ExternalLink, Copy, Check, Monitor } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { parseLyrics } from '@/lib/parseLyrics'
import { useSupabase } from '@/hooks/useSupabase'
import { cn } from '@/lib/utils'

const BACKGROUNDS = [
  { id: 'dark',    label: 'Dark',   gradient: 'radial-gradient(ellipse at center, #1a1a2e 0%, #000 70%)' },
  { id: 'purple',  label: 'Purple', gradient: 'radial-gradient(ellipse at center, #2d1b69 0%, #06030f 70%)' },
  { id: 'blue',    label: 'Blue',   gradient: 'radial-gradient(ellipse at center, #0c1445 0%, #000 70%)' },
  { id: 'green',   label: 'Green',  gradient: 'radial-gradient(ellipse at center, #0a2e1a 0%, #000 70%)' },
  { id: 'teal',    label: 'Teal',   gradient: 'radial-gradient(ellipse at center, #0a2a2a 0%, #000 70%)' },
  { id: 'crimson', label: 'Red',    gradient: 'radial-gradient(ellipse at center, #2a0a0a 0%, #000 70%)' },
]

interface Props {
  title: string
  lyricsText: string // raw lyrics of the default language
}

interface Slide {
  label: string
  content: string
}

export function PresentationController({ title, lyricsText }: Props) {
  const supabase = useSupabase()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [background, setBackground] = useState('dark')
  const [currentIdx, setCurrentIdx] = useState<number | null>(null)
  const [blank, setBlank] = useState(true)
  const [copied, setCopied] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const slides: Slide[] = parseLyrics(lyricsText).map(s => ({
    label: s.label ?? '',
    content: s.content,
  }))

  // Create channel when controller is opened
  useEffect(() => {
    if (!open) return
    const newCode = Math.random().toString(36).slice(2, 8).toUpperCase()
    setCode(newCode)
    setCurrentIdx(null)
    setBlank(true)

    const ch = supabase.channel(`present-${newCode}`, { config: { broadcast: { ack: false } } })
    ch.subscribe()
    channelRef.current = ch

    return () => {
      supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [open, supabase])

  const broadcast = (payload: object) => {
    channelRef.current?.send({ type: 'broadcast', event: 'slide', payload })
  }

  const showSlide = (idx: number) => {
    setCurrentIdx(idx)
    setBlank(false)
    const s = slides[idx]
    broadcast({ blank: false, section: s.label, lines: s.content, title, background })
  }

  const showBlank = () => {
    setBlank(true)
    broadcast({ blank: true, section: '', lines: '', title, background })
  }

  const revealCurrent = () => {
    if (currentIdx !== null) showSlide(currentIdx)
  }

  const changeBackground = (bg: string) => {
    setBackground(bg)
    if (currentIdx !== null && !blank) {
      const s = slides[currentIdx]
      broadcast({ blank: false, section: s.label, lines: s.content, title, background: bg })
    }
  }

  const displayUrl = typeof window !== 'undefined' && code
    ? `${window.location.origin}/present?code=${code}`
    : ''

  const copyUrl = async () => {
    await navigator.clipboard.writeText(displayUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openDisplay = () => {
    window.open(displayUrl, 'songsaver-present', 'width=1280,height=720,menubar=no,toolbar=no')
  }

  // Present button (shown in song detail header)
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/20 hover:bg-purple-500/25 transition-colors"
      >
        <Monitor className="w-3.5 h-3.5" />
        Present
      </button>
    )
  }

  // Full-screen controller overlay — rendered via portal to escape any parent stacking context
  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#09090b' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.08]"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="min-w-0">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">Now Presenting</p>
          <p className="font-semibold text-white truncate">{title}</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0 ml-3"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Display URL ── */}
      <div className="px-4 py-3 border-b border-white/[0.08] space-y-2">
        <p className="text-[10px] text-white/30 uppercase tracking-widest">Projector screen — open this URL in a browser</p>
        <div className="flex items-center gap-2 bg-white/[0.05] rounded-xl px-3 py-2.5 border border-white/[0.08]">
          <code className="text-xs text-white/60 flex-1 truncate">{displayUrl}</code>
          <button onClick={copyUrl} className="shrink-0 text-white/30 hover:text-white/60 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={openDisplay} className="shrink-0 text-purple-400 hover:text-purple-300 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Background picker ── */}
      <div className="px-4 py-3 border-b border-white/[0.08]">
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2.5">Background</p>
        <div className="flex gap-2.5">
          {BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              onClick={() => changeBackground(bg.id)}
              title={bg.label}
              className={cn(
                'w-9 h-9 rounded-full border-2 transition-all duration-150',
                background === bg.id ? 'border-white scale-110 shadow-lg' : 'border-white/20 hover:border-white/40'
              )}
              style={{ background: bg.gradient }}
            />
          ))}
        </div>
      </div>

      {/* ── Sections list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ background: '#09090b' }}>
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Sections — tap to display</p>
        {slides.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-white/30 text-sm">No lyrics added to this song yet</p>
          </div>
        ) : (
          slides.map((slide, i) => (
            <button
              key={i}
              onClick={() => showSlide(i)}
              className={cn(
                'w-full text-left px-4 py-3.5 rounded-2xl border transition-all duration-150',
                currentIdx === i && !blank
                  ? 'bg-purple-600/25 border-purple-500/40 shadow-lg shadow-purple-500/10'
                  : 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.07]'
              )}
            >
              {slide.label && (
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-purple-400/70 mb-1">
                  {slide.label}
                </p>
              )}
              <p className="text-sm text-white/70 font-light leading-snug line-clamp-2">
                {slide.content.split('\n')[0]}
              </p>
            </button>
          ))
        )}
      </div>

      {/* ── Navigation bar ── */}
      <div
        className="px-4 pt-3 pb-4 border-t border-white/[0.08] flex items-center gap-2"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {/* Prev */}
        <button
          onClick={() => currentIdx !== null && currentIdx > 0 && showSlide(currentIdx - 1)}
          disabled={currentIdx === null || currentIdx === 0}
          className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white/60 disabled:opacity-25 hover:bg-white/10 transition-all text-sm font-medium"
        >
          <ChevronLeft className="w-5 h-5" />
          Prev
        </button>

        {/* Blank toggle */}
        <button
          onClick={blank ? revealCurrent : showBlank}
          className={cn(
            'w-14 h-14 flex items-center justify-center rounded-2xl border transition-all duration-150',
            blank
              ? 'bg-purple-600 border-purple-500 shadow-lg shadow-purple-500/30'
              : 'bg-white/[0.06] border-white/[0.08] text-white/60 hover:bg-white/10'
          )}
          title={blank ? 'Show slide' : 'Blank screen'}
        >
          <EyeOff className={cn('w-5 h-5', blank ? 'text-white' : 'text-white/60')} />
        </button>

        {/* Next */}
        <button
          onClick={() => currentIdx !== null && currentIdx < slides.length - 1 && showSlide(currentIdx + 1)}
          disabled={currentIdx === null || currentIdx === slides.length - 1}
          className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white/60 disabled:opacity-25 hover:bg-white/10 transition-all text-sm font-medium"
        >
          Next
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>,
    document.body
  )
}
