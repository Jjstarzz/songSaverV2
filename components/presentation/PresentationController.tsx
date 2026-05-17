'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X, ChevronLeft, ChevronRight, EyeOff, ExternalLink,
  Copy, Check, Monitor, Tv2, List, QrCode, BookOpen, Search,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { parseLyrics } from '@/lib/parseLyrics'
import { useSupabase } from '@/hooks/useSupabase'
import { cn } from '@/lib/utils'
import {
  STATIC_BACKGROUNDS, VIDEO_BACKGROUNDS,
  LIVE_BG_IDS, VIDEO_BG_IDS, VIDEO_BG_URLS, BG_STATIC, ANIMATION_CSS,
  FONT_OPTIONS, SIZE_MULTIPLIERS,
} from '@/lib/presentationBackgrounds'

interface Props {
  title: string
  lyricsText: string
  playlist?: { title: string; lyricsText: string }[]
}

interface Slide {
  label: string
  content: string
}

export function PresentationController({ title, lyricsText, playlist }: Props) {
  const supabase = useSupabase()
  const [open, setOpen] = useState(false)
  const [inlineOpen, setInlineOpen] = useState(false)
  const [showSections, setShowSections] = useState(false)
  const [code, setCode] = useState('')
  const [background, setBackground] = useState('dark')
  const [fontSizeKey, setFontSizeKey] = useState('md')
  const [fontFamily, setFontFamily] = useState('sans')
  const [currentIdx, setCurrentIdx] = useState<number | null>(null)
  const [blank, setBlank] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [notesOpenIdx, setNotesOpenIdx] = useState<number | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [controllerTab, setControllerTab] = useState<'slides' | 'settings' | 'scripture'>('slides')
  const [showJoin, setShowJoin] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [songIdx, setSongIdx] = useState(0)
  const [textColor, setTextColor] = useState('#ffffff')
  const [holdingImageUrl, setHoldingImageUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('songsaver-holding-image') ?? ''
    return ''
  })
  const [holdingInputVal, setHoldingInputVal] = useState('')
  const [scriptureQuery, setScriptureQuery] = useState('')
  const [scriptureResults, setScriptureResults] = useState<{ reference: string; text: string }[]>([])
  const [scriptureSearching, setScriptureSearching] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [translationText, setTranslationText] = useState('')
  const channelRef = useRef<RealtimeChannel | null>(null)

  const activeTitle = playlist ? (playlist[songIdx]?.title ?? '') : title
  const activeLyricsText = playlist ? (playlist[songIdx]?.lyricsText ?? '') : lyricsText

  const slides: Slide[] = parseLyrics(activeLyricsText).map(s => ({
    label: s.label ?? '',
    content: s.content,
  }))

  // Build per-slide translation strings, robust to formatting differences.
  // First tries section-by-section (if counts match), then falls back to
  // distributing lines proportionally by original line count.
  const translationPerSlide: string[] = (() => {
    if (!translationText.trim() || slides.length === 0) return slides.map(() => '')
    const parsed = parseLyrics(translationText)
    if (parsed.length === slides.length) return parsed.map(s => s.content)
    // Fallback: line-by-line proportional
    const tLines = translationText.split('\n').filter(l => l.trim())
    if (tLines.length === 0) return slides.map(() => '')
    let offset = 0
    return slides.map(s => {
      const n = s.content.split('\n').filter(l => l.trim()).length
      const chunk = tLines.slice(offset, offset + n)
      offset += n
      return chunk.join('\n')
    })
  })()

  // Create channel when controller is opened.
  // Reuse the same code for the whole browser session so the projector
  // screen URL stays valid across songs — no need to reload the display tab.
  useEffect(() => {
    if (!open) return

    let sessionCode = sessionStorage.getItem('songsaver-present-code')
    if (!sessionCode) {
      sessionCode = Math.random().toString(36).slice(2, 8).toUpperCase()
      sessionStorage.setItem('songsaver-present-code', sessionCode)
    }
    setCode(sessionCode)
    setCurrentIdx(null)
    setBlank(true)

    const ch = supabase.channel(`present-${sessionCode}`, { config: { broadcast: { ack: false } } })
    ch.subscribe()
    channelRef.current = ch

    return () => {
      supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [open, supabase])

  // Reload translation text whenever the active song changes
  useEffect(() => {
    const saved = localStorage.getItem(`songsaver-translation||${activeTitle}`) ?? ''
    setTranslationText(saved)
  }, [activeTitle])

  // Arrow key navigation when controller is open
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = currentIdx === null ? 0 : Math.min(currentIdx + 1, slides.length - 1)
        showSlide(next)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (currentIdx !== null && currentIdx > 0) showSlide(currentIdx - 1)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentIdx, slides, activeTitle, background, fontSizeKey, fontFamily, textColor])

  const broadcast = (payload: object) => {
    channelRef.current?.send({ type: 'broadcast', event: 'slide', payload })
  }

  // Notes stored in localStorage, keyed by song title + slide label
  const getNote = (label: string) => {
    try { return JSON.parse(localStorage.getItem('slide-notes') ?? '{}')[`${activeTitle}||${label}`] ?? '' }
    catch { return '' }
  }
  const saveNote = (label: string, value: string) => {
    try {
      const all = JSON.parse(localStorage.getItem('slide-notes') ?? '{}')
      all[`${activeTitle}||${label}`] = value
      localStorage.setItem('slide-notes', JSON.stringify(all))
    } catch {}
  }

  const showSlide = (idx: number) => {
    setCurrentIdx(idx)
    setBlank(false)
    const s = slides[idx]
    const next = slides[idx + 1] ?? null
    const upNext = next ? { section: next.label, lines: next.content, title: activeTitle } : null
    const translationLines = showTranslation ? (translationPerSlide[idx] ?? '') : ''
    broadcast({ blank: false, section: s.label, lines: s.content, title: activeTitle, background, fontSizeKey, fontFamily, textColor, holdingImageUrl, upNext, translationLines })
  }

  const showBlank = () => {
    setBlank(true)
    broadcast({ blank: true, section: '', lines: '', title: activeTitle, background, fontSizeKey, fontFamily, textColor, holdingImageUrl })
  }

  const goToSong = (idx: number) => {
    setSongIdx(idx)
    setCurrentIdx(null)
    setBlank(true)
    broadcast({ blank: true, section: '', lines: '', title: playlist![idx].title, background, fontSizeKey, fontFamily, textColor, holdingImageUrl })
  }

  const revealCurrent = () => {
    if (currentIdx !== null) showSlide(currentIdx)
  }

  const changeBackground = (bg: string) => {
    setBackground(bg)
    if (currentIdx !== null && !blank) {
      const s = slides[currentIdx]
      broadcast({ blank: false, section: s.label, lines: s.content, title: activeTitle, background: bg, fontSizeKey, fontFamily, textColor, holdingImageUrl })
    }
  }

  const [scriptureError, setScriptureError] = useState('')
  const searchScripture = async () => {
    if (!scriptureQuery.trim()) return
    setScriptureSearching(true)
    setScriptureResults([])
    setScriptureError('')
    try {
      const res = await fetch(`/api/bible?op=search&q=${encodeURIComponent(scriptureQuery.trim())}`)
      const data = await res.json()
      if (!res.ok) { setScriptureError(data.error ?? 'Search failed'); }
      else setScriptureResults(data.verses ?? [])
    } catch {
      setScriptureError('Could not reach Bible API')
    }
    setScriptureSearching(false)
  }

  const sendVerse = (reference: string, text: string) => {
    setCurrentIdx(null)
    setBlank(false)
    broadcast({ blank: false, section: reference, lines: text, title: '', background, fontSizeKey, fontFamily, textColor, holdingImageUrl })
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

  const joinSession = () => {
    const trimmed = joinInput.trim().toUpperCase()
    if (!trimmed) return
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    sessionStorage.setItem('songsaver-present-code', trimmed)
    setCode(trimmed)
    const ch = supabase.channel(`present-${trimmed}`, { config: { broadcast: { ack: false } } })
    ch.subscribe()
    channelRef.current = ch
    setBlank(true)
    setCurrentIdx(null)
    setShowJoin(false)
    setJoinInput('')
  }

  // Current slide details for inline display
  const currentSlide = currentIdx !== null ? slides[currentIdx] : null
  const inlineLines = currentSlide ? currentSlide.content.split('\n').filter(Boolean) : []
  const inlineBaseVw =
    inlineLines.length <= 2 ? 5.5 :
    inlineLines.length <= 4 ? 4.5 :
    inlineLines.length <= 6 ? 3.8 : 3.2
  const inlineFontSize = `${(inlineBaseVw * (SIZE_MULTIPLIERS[fontSizeKey] ?? 1)).toFixed(2)}vw`
  const inlineFontFamily = FONT_OPTIONS.find(f => f.id === fontFamily)?.family ?? FONT_OPTIONS[0].family

  // Background resolution for inline display
  const isLiveBg = LIVE_BG_IDS.has(background)
  const isVideoBg = VIDEO_BG_IDS.has(background)
  const inlineBgStyle = (isLiveBg || isVideoBg) ? undefined : { background: BG_STATIC[background] ?? BG_STATIC.dark }
  const inlineBgClass = isLiveBg ? `live-${background}` : ''
  const inlineVideoUrl = isVideoBg ? VIDEO_BG_URLS[background] : null

  // ── Present button (shown in song detail / service header) ──
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/20 hover:bg-purple-500/25 transition-colors"
      >
        <Monitor className="w-3.5 h-3.5" />
        {playlist ? 'Present Service' : 'Present'}
      </button>
    )
  }

  // ── Inline display (same-device presentation) — z-[200], above controller ──
  const inlineDisplay = inlineOpen ? createPortal(
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;600&display=swap');${ANIMATION_CSS}`}</style>
      <div
        className={inlineBgClass}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', flexDirection: 'column',
          ...(inlineBgStyle ?? {}),
        }}
      >
      {inlineVideoUrl && (
        <video
          key={background}
          autoPlay loop muted playsInline preload="auto"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
          src={inlineVideoUrl}
        />
      )}
      {/* Section list sheet (slides over inline when open) */}
      {showSections && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'rgba(9,9,11,0.97)',
          display: 'flex', flexDirection: 'column',
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Sections</p>
            <button onClick={() => setShowSections(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slides.map((slide, i) => {
              const firstLine = slide.content.split('\n').find(l => l.trim()) ?? ''
              const isActive = currentIdx === i && !blank
              return (
                <button
                  key={i}
                  onClick={() => { showSlide(i); setShowSections(false) }}
                  style={{
                    textAlign: 'left', padding: '14px 16px', borderRadius: 16,
                    border: `1px solid ${isActive ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    background: isActive ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                  }}
                >
                  {slide.label && (
                    <p style={{ color: '#a78bfa', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
                      {slide.label}
                    </p>
                  )}
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', fontWeight: 300, lineHeight: 1.4 }}>
                    {firstLine || slide.content.slice(0, 60)}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Slide content area — tap to request fullscreen */}
      <div
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8%', position: 'relative', cursor: 'pointer' }}
        onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
      >
        {blank || !currentSlide ? (
          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.875rem', textAlign: 'center' }}>
            {slides.length === 0 ? 'No lyrics added yet' : 'Tap a section to start'}
          </p>
        ) : (
          <>
            {currentSlide.label && (
              <p style={{
                position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: 700,
                letterSpacing: '0.5em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                fontFamily: inlineFontFamily,
              }}>
                {currentSlide.label}
              </p>
            )}
            <p style={{
              color: textColor, textAlign: 'center', fontWeight: 300,
              fontSize: inlineFontSize, lineHeight: 1.55,
              letterSpacing: '0.01em', whiteSpace: 'pre-line',
              fontFamily: inlineFontFamily,
              textShadow: '0 2px 32px rgba(0,0,0,0.9), 0 0 80px rgba(255,255,255,0.04)',
            }}>
              {currentSlide.content}
            </p>
            <p style={{
              position: 'absolute', bottom: '1rem', right: '1rem',
              color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', fontSize: '0.7rem',
              fontFamily: inlineFontFamily,
            }}>
              {activeTitle}
            </p>
          </>
        )}
      </div>

      {/* Bottom control strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Prev */}
        <button
          onClick={() => currentIdx !== null && currentIdx > 0 && showSlide(currentIdx - 1)}
          disabled={currentIdx === null || currentIdx === 0}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: '12px 0', borderRadius: 14,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
            opacity: (currentIdx === null || currentIdx === 0) ? 0.25 : 1,
          }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} /> Prev
        </button>

        {/* Blank toggle */}
        <button
          onClick={blank ? revealCurrent : showBlank}
          style={{
            width: 48, height: 48, flexShrink: 0, borderRadius: 14, border: 'none',
            background: blank ? '#7c3aed' : 'rgba(255,255,255,0.06)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: blank ? '0 0 20px rgba(124,58,237,0.4)' : 'none',
          }}
        >
          <EyeOff style={{ width: 18, height: 18, color: blank ? '#fff' : 'rgba(255,255,255,0.5)' }} />
        </button>

        {/* Next */}
        <button
          onClick={() => currentIdx !== null && currentIdx < slides.length - 1 && showSlide(currentIdx + 1)}
          disabled={currentIdx === null || currentIdx === slides.length - 1}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: '12px 0', borderRadius: 14,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
            opacity: (currentIdx === null || currentIdx === slides.length - 1) ? 0.25 : 1,
          }}
        >
          Next <ChevronRight style={{ width: 16, height: 16 }} />
        </button>

        {/* Sections */}
        <button
          onClick={() => setShowSections(true)}
          style={{
            width: 48, height: 48, flexShrink: 0, borderRadius: 14,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <List style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.5)' }} />
        </button>

        {/* Close inline */}
        <button
          onClick={() => setInlineOpen(false)}
          style={{
            width: 48, height: 48, flexShrink: 0, borderRadius: 14,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.5)' }} />
        </button>
      </div>
    </div>
    </>,
    document.body
  ) : null

  // ── Full-screen controller overlay — z-[100] ──
  const TAB_STYLE = (active: boolean) => ({
    flex: 1, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer',
    color: active ? '#a78bfa' : 'rgba(255,255,255,0.4)',
    fontSize: '0.72rem', fontWeight: active ? 700 : 500,
    borderBottom: `2px solid ${active ? '#7c3aed' : 'transparent'}`,
    transition: 'all 0.15s', letterSpacing: '0.05em',
  })

  const stageUrl = typeof window !== 'undefined' && code ? `${window.location.origin}/stage?code=${code}` : ''

  return (
    <>
      {inlineDisplay}
      {createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#09090b', color: '#ffffff' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', paddingTop: 'max(1rem, env(safe-area-inset-top))', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 2 }}>Now Presenting</p>
              <p style={{ color: '#ffffff', fontWeight: 600, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeTitle}</p>
            </div>
            {/* Live dot */}
            {!blank && currentIdx !== null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 20, padding: '3px 8px', marginRight: 8, flexShrink: 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'live-pulse 1.5s ease-in-out infinite' }} />
                <span style={{ color: '#fca5a5', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em' }}>LIVE</span>
              </span>
            )}
            <button
              onClick={() => setOpen(false)}
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingTop: 2 }}>
            <button style={TAB_STYLE(controllerTab === 'slides')} onClick={() => setControllerTab('slides')}>Slides</button>
            <button style={TAB_STYLE(controllerTab === 'settings')} onClick={() => setControllerTab('settings')}>Settings</button>
            <button style={TAB_STYLE(controllerTab === 'scripture')} onClick={() => setControllerTab('scripture')}>Scripture</button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto" style={{ background: '#09090b' }}>

            {/* ── SLIDES TAB ── */}
            {controllerTab === 'slides' && (
              <div style={{ padding: '12px 16px' }}>

                {/* Song navigation (playlist mode only) */}
                {playlist && playlist.length > 1 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                    padding: '8px 12px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <button
                      onClick={() => goToSong(songIdx - 1)}
                      disabled={songIdx === 0}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: songIdx === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center' }}
                    >
                      <ChevronLeft style={{ width: 16, height: 16 }} />
                    </button>
                    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 1 }}>
                        Song {songIdx + 1} of {playlist.length}
                      </p>
                      <p style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activeTitle}
                      </p>
                    </div>
                    <button
                      onClick={() => goToSong(songIdx + 1)}
                      disabled={songIdx === playlist.length - 1}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: songIdx === playlist.length - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center' }}
                    >
                      <ChevronRight style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                )}

                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Tap a slide to display it</p>

                {slides.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>No lyrics added yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {slides.map((slide, i) => {
                      const previewLines = slide.content.split('\n').filter((l: string) => l.trim()).slice(0, 3).join('\n')
                      const translationPreview = (translationPerSlide[i] ?? '').split('\n').filter((l: string) => l.trim()).slice(0, 3).join('\n')
                      const isActive = currentIdx === i && !blank
                      const hasNote = !!getNote(slide.label)
                      const notesOpen = notesOpenIdx === i
                      return (
                        <div key={i}>
                          <button
                            onClick={() => showSlide(i)}
                            style={{
                              width: '100%', textAlign: 'left', padding: '10px 10px 10px 12px', borderRadius: 12,
                              border: `1px solid ${isActive ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
                              background: isActive ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                              display: 'block', cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: slide.label ? 4 : 0 }}>
                              {slide.label && (
                                <p style={{ color: '#a78bfa', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', flex: 1 }}>
                                  {slide.label}
                                </p>
                              )}
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  if (notesOpen) { setNotesOpenIdx(null) }
                                  else { setNotesOpenIdx(i); setNotesDraft(getNote(slide.label)) }
                                }}
                                title="Notes"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: hasNote ? '#a78bfa' : 'rgba(255,255,255,0.18)', fontSize: '0.65rem', flexShrink: 0, lineHeight: 1 }}
                              >
                                ✎
                              </button>
                            </div>
                            <p style={{ color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)', fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.45, whiteSpace: 'pre-line', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                              {previewLines || slide.content.slice(0, 80)}
                            </p>
                            {translationPreview && (
                              <p style={{ marginTop: 5, color: isActive ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontWeight: 300, lineHeight: 1.4, whiteSpace: 'pre-line', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                {translationPreview}
                              </p>
                            )}
                          </button>
                          {notesOpen && (
                            <div style={{ marginTop: 3, padding: '6px 8px', borderRadius: '0 0 10px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none' }}>
                              <textarea
                                value={notesDraft}
                                onChange={e => setNotesDraft(e.target.value)}
                                onBlur={() => saveNote(slide.label, notesDraft)}
                                placeholder="Notes (only visible here)…"
                                rows={2}
                                autoFocus
                                style={{ width: '100%', padding: '5px 7px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── SETTINGS TAB ── */}
            {controllerTab === 'settings' && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Projector URL */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Projector Screen</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <code style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayUrl}</code>
                    <button onClick={() => setShowQr(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: showQr ? '#a78bfa' : 'rgba(255,255,255,0.5)', flexShrink: 0 }} title="QR code">
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button onClick={copyUrl} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#34d399' : 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button onClick={openDisplay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', flexShrink: 0 }}>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                  {showQr && displayUrl && (
                    <div style={{ marginTop: 10, padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ background: '#fff', borderRadius: 12, padding: 12 }}>
                        <QRCode value={displayUrl} size={160} bgColor="#ffffff" fgColor="#09090b" level="M" />
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', textAlign: 'center' }}>Scan to open the projector screen</p>
                    </div>
                  )}
                  <button
                    onClick={() => setInlineOpen(v => !v)}
                    style={{
                      marginTop: 8, width: '100%', padding: '9px 16px', borderRadius: 10,
                      background: inlineOpen ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${inlineOpen ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: inlineOpen ? '#a78bfa' : 'rgba(255,255,255,0.55)',
                      cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Tv2 style={{ width: 14, height: 14 }} />
                    {inlineOpen ? 'Presenting on this screen ✓' : 'Present on this screen'}
                  </button>
                  <button
                    onClick={() => setShowJoin(v => !v)}
                    style={{ marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.28)', fontSize: '0.68rem', padding: '3px 0', display: 'block', width: '100%', textAlign: 'center' }}
                  >
                    {showJoin ? '✕ Cancel' : '+ Join an existing session'}
                  </button>
                  {showJoin && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        value={joinInput}
                        onChange={e => setJoinInput(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && joinSession()}
                        placeholder="Enter session code"
                        maxLength={8}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.82rem', outline: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                      />
                      <button onClick={joinSession} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)', color: '#c4b5fd', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                        Join
                      </button>
                    </div>
                  )}
                </div>

                {/* Stage monitor URL */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Stage Monitor</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <code style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stageUrl}</code>
                    <button onClick={() => stageUrl && navigator.clipboard.writeText(stageUrl)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => stageUrl && window.open(stageUrl, 'songsaver-stage', 'width=1024,height=600,menubar=no,toolbar=no')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', flexShrink: 0 }}>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Background picker */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Background</p>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Static</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-2 mb-4">
                    {STATIC_BACKGROUNDS.map((bg) => (
                      <button key={bg.id} onClick={() => changeBackground(bg.id)} className="flex flex-col items-center gap-1">
                        <span className={cn('w-9 h-9 rounded-full border-2 transition-all duration-150 block', background === bg.id ? 'border-white scale-110 shadow-lg' : 'border-white/20')} style={{ background: bg.swatch }} />
                        <span style={{ fontSize: '0.55rem', color: background === bg.id ? '#fff' : 'rgba(255,255,255,0.35)' }}>{bg.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Video</p>
                    <span style={{ fontSize: '0.52rem', color: '#34d399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 4, padding: '1px 5px' }}>MP4</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    {VIDEO_BACKGROUNDS.map((bg) => (
                      <button key={bg.id} onClick={() => changeBackground(bg.id)} className="flex flex-col items-center gap-1">
                        <span className={cn('w-9 h-9 rounded-full border-2 transition-all duration-150 block', background === bg.id ? 'border-white scale-110 shadow-lg' : 'border-white/20')} style={{ background: bg.swatch }} />
                        <span style={{ fontSize: '0.55rem', color: background === bg.id ? '#fff' : 'rgba(255,255,255,0.35)' }}>{bg.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font & size */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Text Size</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {(['sm', 'md', 'lg', 'xl'] as const).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setFontSizeKey(key)
                          if (currentIdx !== null && !blank) {
                            const s = slides[currentIdx]
                            broadcast({ blank: false, section: s.label, lines: s.content, title: activeTitle, background, fontSizeKey: key, fontFamily, textColor, holdingImageUrl })
                          }
                        }}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: 10,
                          border: `1px solid ${fontSizeKey === key ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.12)'}`,
                          background: fontSizeKey === key ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)',
                          color: fontSizeKey === key ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                          cursor: 'pointer', fontSize: key === 'sm' ? '0.7rem' : key === 'md' ? '0.8rem' : key === 'lg' ? '0.9rem' : '1rem',
                          fontWeight: 600, transition: 'all 0.15s',
                        }}
                      >
                        {key.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Font Style</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {FONT_OPTIONS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setFontFamily(f.id)
                          if (currentIdx !== null && !blank) {
                            const s = slides[currentIdx]
                            broadcast({ blank: false, section: s.label, lines: s.content, title: activeTitle, background, fontSizeKey, fontFamily: f.id, textColor, holdingImageUrl })
                          }
                        }}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: 10,
                          border: `1px solid ${fontFamily === f.id ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.12)'}`,
                          background: fontFamily === f.id ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)',
                          color: fontFamily === f.id ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                          cursor: 'pointer', fontSize: '0.72rem', fontFamily: f.family,
                          fontWeight: 500, transition: 'all 0.15s',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Text Colour</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[
                      { color: '#ffffff', label: 'White' },
                      { color: '#fef9c3', label: 'Cream' },
                      { color: '#fde68a', label: 'Yellow' },
                      { color: '#bfdbfe', label: 'Blue' },
                      { color: '#fbcfe8', label: 'Pink' },
                      { color: '#bbf7d0', label: 'Mint' },
                    ].map(({ color, label }) => (
                      <button
                        key={color}
                        title={label}
                        onClick={() => {
                          setTextColor(color)
                          if (currentIdx !== null && !blank) {
                            const s = slides[currentIdx]
                            broadcast({ blank: false, section: s.label, lines: s.content, title: activeTitle, background, fontSizeKey, fontFamily, textColor: color })
                          }
                        }}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', background: color,
                          border: textColor === color ? '2.5px solid #a78bfa' : '2px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer', flexShrink: 0,
                          transform: textColor === color ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.15s',
                          boxShadow: textColor === color ? '0 0 10px rgba(167,139,250,0.5)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Translation */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Translation / Transliteration</p>
                    <button
                      onClick={() => {
                        const next = !showTranslation
                        setShowTranslation(next)
                        if (currentIdx !== null && !blank) {
                          const s = slides[currentIdx]
                          const tl = next ? (translationPerSlide[currentIdx] ?? '') : ''
                          broadcast({ blank: false, section: s.label, lines: s.content, title: activeTitle, background, fontSizeKey, fontFamily, textColor, holdingImageUrl, translationLines: tl })
                        }
                      }}
                      style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
                        background: showTranslation ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.07)',
                        border: `1px solid ${showTranslation ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.12)'}`,
                        color: showTranslation ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {showTranslation ? 'On' : 'Off'}
                    </button>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', marginBottom: 8 }}>
                    Paste translation lyrics below (must have the same sections as the main lyrics). Toggle to show both on screen.
                  </p>
                  <textarea
                    value={translationText}
                    onChange={e => {
                      setTranslationText(e.target.value)
                      localStorage.setItem(`songsaver-translation||${activeTitle}`, e.target.value)
                    }}
                    placeholder={'[Verse 1]\nTranslation line 1\nTranslation line 2\n\n[Chorus]\n...'}
                    rows={7}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 12, boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', outline: 'none',
                      resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
                    }}
                  />
                </div>

                {/* Holding slide image */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Holding Slide Image</p>
                  <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.65rem', marginBottom: 8 }}>Shown when screen is blanked. Paste an image URL.</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="url"
                      placeholder="https://..."
                      defaultValue={holdingImageUrl}
                      onChange={e => setHoldingInputVal(e.target.value)}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.72rem', outline: 'none' }}
                    />
                    <button
                      onClick={() => { const url = holdingInputVal.trim(); setHoldingImageUrl(url); localStorage.setItem('songsaver-holding-image', url) }}
                      style={{ padding: '7px 12px', borderRadius: 10, flexShrink: 0, background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)', color: '#c4b5fd', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
                    >
                      Set
                    </button>
                    {holdingImageUrl && (
                      <button
                        onClick={() => { setHoldingImageUrl(''); setHoldingInputVal(''); localStorage.removeItem('songsaver-holding-image') }}
                        style={{ padding: '7px 10px', borderRadius: 10, flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.72rem' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {holdingImageUrl && (
                    <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', height: 56 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={holdingImageUrl} alt="Holding slide preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SCRIPTURE TAB ── */}
            {controllerTab === 'scripture' && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>Search by reference (John 3:16) or keyword</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="e.g. John 3:16 or peace"
                    value={scriptureQuery}
                    onChange={e => setScriptureQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchScripture()}
                    autoFocus
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                  />
                  <button
                    onClick={searchScripture}
                    disabled={scriptureSearching}
                    style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)', color: '#c4b5fd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {scriptureSearching
                      ? <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      : <Search style={{ width: 16, height: 16 }} />}
                  </button>
                </div>

                {scriptureResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {scriptureResults.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => sendVerse(v.reference, v.text)}
                        style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 14, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 4 }}
                      >
                        <span style={{ color: '#a78bfa', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{v.reference}</span>
                        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', lineHeight: 1.5, fontWeight: 300 }}>
                          {v.text.length > 200 ? v.text.slice(0, 200) + '…' : v.text}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {scriptureError && (
                  <p style={{ color: '#f87171', fontSize: '0.72rem', textAlign: 'center' }}>{scriptureError}</p>
                )}
                {!scriptureSearching && !scriptureError && scriptureResults.length === 0 && scriptureQuery && (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', textAlign: 'center', padding: '12px 0' }}>No results</p>
                )}
              </div>
            )}
          </div>

          {/* Navigation bar */}
          <div
            className="px-4 pt-3 pb-4 border-t border-white/[0.08] flex items-center gap-2"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={() => currentIdx !== null && currentIdx > 0 && showSlide(currentIdx - 1)}
              disabled={currentIdx === null || currentIdx === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white/60 disabled:opacity-25 hover:bg-white/10 transition-all text-sm font-medium"
            >
              <ChevronLeft className="w-5 h-5" /> Prev
            </button>

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

            <button
              onClick={() => currentIdx !== null && currentIdx < slides.length - 1 && showSlide(currentIdx + 1)}
              disabled={currentIdx === null || currentIdx === slides.length - 1}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white/60 disabled:opacity-25 hover:bg-white/10 transition-all text-sm font-medium"
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <style>{`@keyframes live-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>,
        document.body
      )}
    </>
  )
}
