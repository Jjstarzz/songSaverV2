'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X, ChevronLeft, ChevronRight, EyeOff, ExternalLink,
  Copy, Check, Monitor, Tv2, List, QrCode,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { parseLyrics } from '@/lib/parseLyrics'
import { useSupabase } from '@/hooks/useSupabase'
import { cn } from '@/lib/utils'
import {
  STATIC_BACKGROUNDS, LIVE_BACKGROUNDS,
  LIVE_BG_IDS, BG_STATIC, ANIMATION_CSS,
  FONT_OPTIONS, SIZE_MULTIPLIERS,
} from '@/lib/presentationBackgrounds'

interface Props {
  title: string
  lyricsText: string
}

interface Slide {
  label: string
  content: string
}

export function PresentationController({ title, lyricsText }: Props) {
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
  const [showFontControls, setShowFontControls] = useState(false)
  const [showBackgroundControls, setShowBackgroundControls] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const slides: Slide[] = parseLyrics(lyricsText).map(s => ({
    label: s.label ?? '',
    content: s.content,
  }))

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
  }, [open, currentIdx, slides, title, background, fontSizeKey, fontFamily])

  const broadcast = (payload: object) => {
    channelRef.current?.send({ type: 'broadcast', event: 'slide', payload })
  }

  const showSlide = (idx: number) => {
    setCurrentIdx(idx)
    setBlank(false)
    const s = slides[idx]
    broadcast({ blank: false, section: s.label, lines: s.content, title, background, fontSizeKey, fontFamily })
  }

  const showBlank = () => {
    setBlank(true)
    broadcast({ blank: true, section: '', lines: '', title, background, fontSizeKey, fontFamily })
  }

  const revealCurrent = () => {
    if (currentIdx !== null) showSlide(currentIdx)
  }

  const changeBackground = (bg: string) => {
    setBackground(bg)
    if (currentIdx !== null && !blank) {
      const s = slides[currentIdx]
      broadcast({ blank: false, section: s.label, lines: s.content, title, background: bg, fontSizeKey, fontFamily })
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
  const inlineBgStyle = isLiveBg ? undefined : { background: BG_STATIC[background] ?? BG_STATIC.dark }
  const inlineBgClass = isLiveBg ? `live-${background}` : ''

  // ── Present button (shown in song detail header) ──
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
              color: '#ffffff', textAlign: 'center', fontWeight: 300,
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
              {title}
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
  return (
    <>
      {inlineDisplay}
      {createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#09090b', color: '#ffffff' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', paddingTop: 'max(1rem, env(safe-area-inset-top))', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 2 }}>Now Presenting</p>
              <p style={{ color: '#ffffff', fontWeight: 600, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Display URL */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Projector screen URL</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <code style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayUrl}</code>
              <button onClick={() => setShowQr(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: showQr ? '#a78bfa' : 'rgba(255,255,255,0.5)', flexShrink: 0 }} title="Show QR code">
                <QrCode className="w-4 h-4" />
              </button>
              <button onClick={copyUrl} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#34d399' : 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              <button onClick={openDisplay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', flexShrink: 0 }}>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            {/* QR code panel */}
            {showQr && displayUrl && (
              <div style={{
                marginTop: 12, padding: 16, borderRadius: 16,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}>
                {/* White card behind QR so it scans cleanly on dark background */}
                <div style={{ background: '#ffffff', borderRadius: 12, padding: 12, display: 'inline-block' }}>
                  <QRCode
                    value={displayUrl}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#09090b"
                    level="M"
                  />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', textAlign: 'center', letterSpacing: '0.05em' }}>
                  Scan to open on the projector screen
                </p>
              </div>
            )}

            {/* Present on this screen button */}
            <button
              onClick={() => setInlineOpen((v) => !v)}
              style={{
                marginTop: 10, width: '100%', padding: '10px 16px', borderRadius: 12,
                background: inlineOpen ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${inlineOpen ? 'rgba(139,92,246,0.45)' : 'rgba(255,255,255,0.1)'}`,
                color: inlineOpen ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Tv2 style={{ width: 14, height: 14 }} />
              {inlineOpen ? 'Presenting on this screen ✓' : 'Present on this screen'}
            </button>
          </div>

          {/* Background picker — collapsible */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setShowBackgroundControls(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Background
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', display: 'inline-block', transition: 'transform 0.2s', transform: showBackgroundControls ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            </button>

            {showBackgroundControls && (
              <div style={{ padding: '0 16px 12px' }}>
                {/* Static row */}
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Static</p>
                <div className="flex gap-2.5 mb-3">
                  {STATIC_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => changeBackground(bg.id)}
                      title={bg.label}
                      className={cn(
                        'w-9 h-9 rounded-full border-2 transition-all duration-150',
                        background === bg.id ? 'border-white scale-110 shadow-lg' : 'border-white/20 hover:border-white/40'
                      )}
                      style={{ background: bg.swatch }}
                    />
                  ))}
                </div>

                {/* Live row */}
                <div className="flex items-center gap-2 mb-2">
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Live</p>
                  <span style={{ fontSize: '0.55rem', color: '#a78bfa', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.1em' }}>ANIMATED</span>
                </div>
                <div className="flex gap-2.5">
                  {LIVE_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => changeBackground(bg.id)}
                      title={bg.label}
                      className={cn(
                        'w-9 h-9 rounded-full border-2 transition-all duration-150 relative',
                        background === bg.id ? 'border-white scale-110 shadow-lg' : 'border-white/20 hover:border-white/40'
                      )}
                      style={{ background: bg.swatch }}
                    >
                      {background !== bg.id && (
                        <span style={{
                          position: 'absolute', inset: -3, borderRadius: '50%',
                          border: '1px solid rgba(167,139,250,0.25)',
                        }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Font controls — collapsible */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setShowFontControls(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Font &amp; Size
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', transition: 'transform 0.2s', display: 'inline-block', transform: showFontControls ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            </button>

            {showFontControls && (
              <div style={{ padding: '0 16px 12px' }}>
                {/* Size row */}
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Text Size</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {(['sm', 'md', 'lg', 'xl'] as const).map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        setFontSizeKey(key)
                        if (currentIdx !== null && !blank) {
                          const s = slides[currentIdx]
                          broadcast({ blank: false, section: s.label, lines: s.content, title, background, fontSizeKey: key, fontFamily })
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

                {/* Font family row */}
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Font Style</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setFontFamily(f.id)
                        if (currentIdx !== null && !blank) {
                          const s = slides[currentIdx]
                          broadcast({ blank: false, section: s.label, lines: s.content, title, background, fontSizeKey, fontFamily: f.id })
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
              </div>
            )}
          </div>

          {/* Sections list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ background: '#09090b' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Sections — tap to display</p>

            {/* Now Playing preview */}
            {currentIdx !== null && !blank && (
              <div style={{
                padding: '10px 14px', borderRadius: 12, marginBottom: 8,
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(139,92,246,0.35)',
              }}>
                <p style={{ color: '#a78bfa', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
                  Now on screen
                </p>
                {slides[currentIdx].label && (
                  <p style={{ color: '#c4b5fd', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>
                    {slides[currentIdx].label}
                  </p>
                )}
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 300, lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                  {slides[currentIdx].content.trim()}
                </p>
              </div>
            )}

            {slides.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>No lyrics added to this song yet</p>
              </div>
            ) : (
              slides.map((slide, i) => {
                const previewLines = slide.content.split('\n').filter((l) => l.trim()).slice(0, 2).join('\n')
                const isActive = currentIdx === i && !blank
                return (
                  <button
                    key={i}
                    onClick={() => showSlide(i)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 16,
                      border: `1px solid ${isActive ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.12)'}`,
                      background: isActive ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.06)',
                      display: 'block', cursor: 'pointer',
                    }}
                  >
                    {slide.label && (
                      <p style={{ color: '#a78bfa', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
                        {slide.label}
                      </p>
                    )}
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', fontWeight: 300, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', whiteSpace: 'pre-line' }}>
                      {previewLines || slide.content.slice(0, 80)}
                    </p>
                  </button>
                )
              })
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
        </div>,
        document.body
      )}
    </>
  )
}
