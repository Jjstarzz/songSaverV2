'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, ChevronLeft, ChevronRight, EyeOff, ExternalLink,
  Copy, Check, Monitor, Tv2, List, QrCode, Search, Church,
} from 'lucide-react'
import dynamic from 'next/dynamic'
const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })
import type { RealtimeChannel } from '@supabase/supabase-js'
import { toSlides } from '@/lib/parseLyrics'
import { useSupabase } from '@/hooks/useSupabase'
import { cn } from '@/lib/utils'
import { LANGUAGE_NAMES } from '@/types/database'
import { BIBLE_BOOKS } from '@/lib/bibleData'
import { FONT_OPTIONS, SIZE_MULTIPLIERS } from '@/lib/presentationBackgrounds'
import { presentChannelName, REQUEST_STATE_EVENT, SLIDE_EVENT, type PresentState } from '@/lib/presentationProtocol'
import { BackgroundLayer, PresentationStyles } from './BackgroundLayer'
import { BackgroundPicker } from './BackgroundPicker'

interface LyricsEntry {
  id: string
  language: string
  lyrics: string
}

interface Props {
  title: string
  lyricsText: string
  availableLyrics?: LyricsEntry[]
  playlist?: { title: string; lyricsText: string; availableLyrics?: LyricsEntry[] }[]
  /** Open the controller on mount (used by the lazy PresentButton) */
  defaultOpen?: boolean
  /** Called when the controller is closed */
  onClose?: () => void
}

interface Slide {
  label: string
  content: string
}

export function PresentationController({ title, lyricsText, availableLyrics, playlist, defaultOpen = false, onClose }: Props) {
  const supabase = useSupabase()
  const [open, setOpenState] = useState(defaultOpen)
  const setOpen = (v: boolean) => { setOpenState(v); if (!v) onClose?.() }
  const [inlineOpen, setInlineOpen] = useState(false)
  const [showSections, setShowSections] = useState(false)
  const [code, setCode] = useState('')
  const [background, setBackground] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('songsaver-bg') ?? 'dark') : 'dark')
  const [fontSizeKey, setFontSizeKey] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('songsaver-font-size') ?? 'md') : 'md')
  const [fontFamily, setFontFamily] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('songsaver-font-family') ?? 'sans') : 'sans')
  const [currentIdx, setCurrentIdx] = useState<number | null>(null)
  const [blank, setBlank] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [notesOpenIdx, setNotesOpenIdx] = useState<number | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [controllerTab, setControllerTab] = useState<'slides' | 'look' | 'screens' | 'scripture'>('slides')
  const [showJoin, setShowJoin] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [songIdx, setSongIdx] = useState(0)
  const [textColor, setTextColor] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem('songsaver-text-color') ?? '#ffffff') : '#ffffff')
  const [holdingImageUrl, setHoldingImageUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('songsaver-holding-image') ?? ''
    return ''
  })
  const [holdingInputVal, setHoldingInputVal] = useState('')
  const [scriptureQuery, setScriptureQuery] = useState('')
  const [scriptureResults, setScriptureResults] = useState<{ reference: string; text: string }[]>([])
  const [scriptureSearching, setScriptureSearching] = useState(false)
  // primaryLangId / secondaryLangId are song_lyrics IDs; null = default / none
  const [primaryLangId, setPrimaryLangId] = useState<string | null>(null)
  const [secondaryLangId, setSecondaryLangId] = useState<string | null>(null)
  const [screensaverEnabled, setScreensaverEnabled] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('songsaver-screensaver-on') !== 'false' : true)
  const [screensaverInterval, setScreensaverInterval] = useState(() => typeof window !== 'undefined' ? (Number(localStorage.getItem('songsaver-screensaver-secs')) || 8) : 8)
  const [logoMode, setLogoMode] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  // Everything last sent to the screens. Settings changes merge into it, and
  // it's re-sent when a projector/stage screen (re)connects.
  const lastStateRef = useRef<PresentState | null>(null)
  // Set when Next/Prev crosses into another song: which slide to show once its lyrics load
  const pendingSlideRef = useRef<'first' | 'last' | null>(null)
  const langInitRef = useRef(false)

  // Browse state for Scripture tab
  interface VerseRef { id: string; reference: string }
  const [scriptureTab, setScriptureTab] = useState<'browse' | 'search'>('search')
  const [browseBook, setBrowseBook] = useState<typeof BIBLE_BOOKS[0] | null>(null)
  const [browseChapter, setBrowseChapter] = useState<number | null>(null)
  const [browseVerses, setBrowseVerses] = useState<VerseRef[]>([])
  const [loadingVerses, setLoadingVerses] = useState(false)
  const [browseVerseIdx, setBrowseVerseIdx] = useState<number | null>(null)
  const [loadingPassage, setLoadingPassage] = useState(false)
  const bookColRef = useRef<HTMLDivElement>(null)
  const chColRef   = useRef<HTMLDivElement>(null)
  const vsColRef   = useRef<HTMLDivElement>(null)

  const activeTitle = playlist ? (playlist[songIdx]?.title ?? '') : title
  const activeAvailableLyrics = playlist ? (playlist[songIdx]?.availableLyrics ?? availableLyrics ?? []) : (availableLyrics ?? [])

  // Reset language selections when song changes; auto-select secondary if available
  useEffect(() => {
    setPrimaryLangId(null)
    setSecondaryLangId(activeAvailableLyrics.length >= 2 ? activeAvailableLyrics[1].id : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTitle])

  const defaultLyricsText = playlist ? (playlist[songIdx]?.lyricsText ?? '') : lyricsText
  const primaryLyrics = primaryLangId
    ? (activeAvailableLyrics.find(l => l.id === primaryLangId)?.lyrics ?? defaultLyricsText)
    : defaultLyricsText
  const secondaryLyrics = secondaryLangId
    ? (activeAvailableLyrics.find(l => l.id === secondaryLangId)?.lyrics ?? '')
    : ''

  const slides: Slide[] = useMemo(() =>
    toSlides(primaryLyrics).map(s => ({ label: s.label ?? '', content: s.content })),
    [primaryLyrics]
  )

  const translationPerSlide: string[] = useMemo(() => {
    if (!secondaryLyrics.trim() || slides.length === 0) return slides.map(() => '')
    const parsed = toSlides(secondaryLyrics)
    if (parsed.length === slides.length) return parsed.map(s => s.content)
    const tLines = secondaryLyrics.split('\n').filter(l => l.trim())
    if (tLines.length === 0) return slides.map(() => '')
    let offset = 0
    return slides.map(s => {
      const n = s.content.split('\n').filter(l => l.trim()).length
      const chunk = tLines.slice(offset, offset + n)
      offset += n
      return chunk.join('\n')
    })
  }, [secondaryLyrics, slides])

  // Re-broadcast immediately when the language selection changes so the projector
  // updates without the presenter needing to re-click the current slide.
  useEffect(() => {
    if (!langInitRef.current) { langInitRef.current = true; return }
    if (!blank && currentIdx !== null && slides[currentIdx]) showSlide(currentIdx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondaryLangId, primaryLangId])

  // After Next/Prev moves into another song, show its first/last slide once its lyrics are ready
  useEffect(() => {
    const pending = pendingSlideRef.current
    if (!pending) return
    pendingSlideRef.current = null
    if (slides.length > 0) showSlide(pending === 'first' ? 0 : slides.length - 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides])

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

    const ch = connectChannel(sessionCode)

    return () => {
      supabase.removeChannel(ch)
      channelRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supabase])


  // Arrow key navigation when controller is open
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      // Presentation clickers send PageDown/PageUp (and often '.'/'b' for black screen)
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault(); goNext()
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault(); goPrev()
      } else if (e.key === 'b' || e.key === 'B' || e.key === '.') {
        e.preventDefault(); if (blank) revealCurrent(); else showBlank()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentIdx, slides, activeTitle, background, fontSizeKey, fontFamily, textColor, blank, songIdx])

  /** Send a full state to the screens and remember it. */
  const send = (state: PresentState) => {
    lastStateRef.current = state
    channelRef.current?.send({ type: 'broadcast', event: SLIDE_EVENT, payload: state })
  }

  /** Current look settings (as of this render). */
  const appearance = () => ({
    background, fontSizeKey, fontFamily, textColor, holdingImageUrl, screensaverEnabled, screensaverInterval,
  })

  /** Join a presentation channel; replies to screens asking for the current state. */
  const connectChannel = (sessionCode: string) => {
    const ch = supabase.channel(presentChannelName(sessionCode), { config: { broadcast: { ack: false } } })
    ch.on('broadcast', { event: REQUEST_STATE_EVENT }, () => {
      if (lastStateRef.current) {
        ch.send({ type: 'broadcast', event: SLIDE_EVENT, payload: lastStateRef.current })
      }
    })
    ch.subscribe()
    channelRef.current = ch
    return ch
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
    const s = slides[idx]
    if (!s) return
    setCurrentIdx(idx)
    setBlank(false)
    setLogoMode(false)
    const next = slides[idx + 1] ?? null
    const nextSong = !next && playlist ? playlist[songIdx + 1] : undefined
    const upNext = next
      ? { section: next.label, lines: next.content, title: activeTitle }
      : nextSong ? (() => { const first = toSlides(nextSong.lyricsText)[0]; return { section: first?.label ?? '', lines: first?.content ?? '', title: nextSong.title } })() : null
    send({
      ...appearance(),
      blank: false,
      lines: s.content,
      translationLines: secondaryLangId ? (translationPerSlide[idx] ?? '') : '',
      title: activeTitle,
      section: s.label, // stage monitor only — the projector never shows section names
      upNext,
      logoMode: false,
    })
  }

  const showBlank = () => {
    setBlank(true)
    send({ ...(lastStateRef.current ?? { lines: '', title: activeTitle, ...appearance() }), blank: true, logoMode })
  }

  /** Switch songs in a service. `silent` skips the blank broadcast when a slide follows immediately. */
  const goToSong = (idx: number, silent = false) => {
    if (!playlist || idx < 0 || idx >= playlist.length) return
    setSongIdx(idx)
    setCurrentIdx(null)
    setBlank(true)
    setLogoMode(false)
    if (!silent) {
      send({ ...appearance(), blank: true, lines: '', title: playlist[idx].title, upNext: null, logoMode: false })
    }
  }

  const canGoNext = slides.length > 0 && (
    currentIdx === null || currentIdx < slides.length - 1 || (!!playlist && songIdx < playlist.length - 1)
  )
  const canGoPrev = (currentIdx !== null && currentIdx > 0) || (!!playlist && songIdx > 0)

  /** Next slide; from the last slide of a song, the first slide of the next song. */
  const goNext = () => {
    if (currentIdx === null) { if (slides.length) showSlide(0); return }
    if (currentIdx < slides.length - 1) { showSlide(currentIdx + 1); return }
    if (playlist && songIdx < playlist.length - 1) {
      pendingSlideRef.current = 'first'
      goToSong(songIdx + 1, true)
    }
  }

  /** Previous slide; from the first slide of a song, the last slide of the previous song. */
  const goPrev = () => {
    if (currentIdx !== null && currentIdx > 0) { showSlide(currentIdx - 1); return }
    if (playlist && songIdx > 0) {
      pendingSlideRef.current = 'last'
      goToSong(songIdx - 1, true)
    }
  }

  const toggleLogoMode = () => {
    const next = !logoMode
    setLogoMode(next)
    setBlank(true)
    send({ ...(lastStateRef.current ?? { lines: '', title: activeTitle, ...appearance() }), blank: true, logoMode: next })
  }

  /** Un-blank: bring back whatever was last on screen (a song slide or a scripture verse). */
  const revealCurrent = () => {
    const last = lastStateRef.current
    if (last && last.lines) {
      setBlank(false)
      setLogoMode(false)
      send({ ...last, blank: false, logoMode: false })
    } else if (slides.length) {
      showSlide(currentIdx ?? 0)
    }
  }

  // Apply a settings change to whatever is on screen right now (slide, verse or blank).
  const rebroadcast = (overrides: Partial<PresentState> = {}) => {
    send({
      ...(lastStateRef.current ?? { blank: true, lines: '', title: activeTitle }),
      ...appearance(),
      logoMode,
      ...overrides,
    })
  }

  const changeBackground = (bg: string) => {
    setBackground(bg)
    localStorage.setItem('songsaver-bg', bg)
    rebroadcast({ background: bg })
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
    setLogoMode(false)
    send({ ...appearance(), blank: false, lines: text, translationLines: '', title: '', reference, section: reference, upNext: null, logoMode: false })
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
    connectChannel(trimmed)
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


  // ── Present button (shown in song detail / service header) ──
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={playlist ? 'Present service' : 'Present song'}
        className="shrink-0 flex items-center gap-1.5 px-3 min-h-[36px] rounded-xl text-xs font-medium bg-accent-500/15 text-accent-300 border border-accent-500/20 hover:bg-accent-500/25 transition-colors"
      >
        <Monitor className="w-3.5 h-3.5" />
        Present
      </button>
    )
  }

  // ── Inline display (same-device presentation) — z-[200], above controller ──
  const inlineDisplay = inlineOpen ? createPortal(
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;600&display=swap');` }} />
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#000',
        }}
      >
      <BackgroundLayer id={background} />
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
                    border: `1px solid ${isActive ? 'rgba(140,201,179,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    background: isActive ? 'rgba(35,102,83,0.25)' : 'rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                  }}
                >
                  {slide.label && (
                    <p style={{ color: '#8cc9b3', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
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
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8%', position: 'relative', cursor: 'pointer', zIndex: 1 }}
        onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
      >
        {blank || !currentSlide ? (
          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.875rem', textAlign: 'center' }}>
            {slides.length === 0 ? 'No lyrics added yet' : 'Tap a section to start'}
          </p>
        ) : (
          <>
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
        display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 2,
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Prev */}
        <button
          onClick={goPrev}
          disabled={!canGoPrev}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: '12px 0', borderRadius: 14,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
            opacity: canGoPrev ? 1 : 0.25,
          }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} /> Prev
        </button>

        {/* Logo mode toggle */}
        <button
          onClick={toggleLogoMode}
          title="Show church logo on projector"
          style={{
            width: 44, height: 48, flexShrink: 0, borderRadius: 14,
            border: logoMode ? 'none' : '1px solid rgba(255,255,255,0.10)',
            background: logoMode ? '#236653' : 'rgba(255,255,255,0.06)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: logoMode ? '0 0 20px rgba(35,102,83,0.4)' : 'none',
          }}
        >
          <Church style={{ width: 17, height: 17, color: logoMode ? '#fff' : 'rgba(255,255,255,0.45)' }} />
        </button>

        {/* Blank toggle */}
        <button
          onClick={blank ? revealCurrent : showBlank}
          style={{
            width: 44, height: 48, flexShrink: 0, borderRadius: 14,
            border: (blank && !logoMode) ? 'none' : '1px solid rgba(255,255,255,0.10)',
            background: (blank && !logoMode) ? '#236653' : 'rgba(255,255,255,0.06)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: (blank && !logoMode) ? '0 0 20px rgba(35,102,83,0.4)' : 'none',
          }}
        >
          <EyeOff style={{ width: 18, height: 18, color: (blank && !logoMode) ? '#fff' : 'rgba(255,255,255,0.5)' }} />
        </button>

        {/* Next */}
        <button
          onClick={goNext}
          disabled={!canGoNext}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: '12px 0', borderRadius: 14,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
            opacity: canGoNext ? 1 : 0.25,
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
    color: active ? '#8cc9b3' : 'rgba(255,255,255,0.4)',
    fontSize: '0.72rem', fontWeight: active ? 700 : 500,
    borderBottom: `2px solid ${active ? '#236653' : 'transparent'}`,
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
              aria-label="Close presenter"
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview panel */}
          {(() => {
            const previewContent = !blank ? lastStateRef.current : null
            const previewLines = previewContent?.lines.split('\n').filter(Boolean).slice(0, 3).join('\n') ?? ''
            const previewFontSize = `${(0.62 * (SIZE_MULTIPLIERS[fontSizeKey] ?? 1)).toFixed(2)}rem`
            const previewFontFamily = FONT_OPTIONS.find(f => f.id === fontFamily)?.family ?? FONT_OPTIONS[0].family
            return (
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: 420, margin: '0 auto', aspectRatio: '16 / 9', maxHeight: 180, overflow: 'hidden', background: '#000' }}>
                  <BackgroundLayer id={background} still />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                    {blank && logoMode ? (
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>Logo showing</span>
                    ) : blank ? (
                      holdingImageUrl
                        ? <img src={holdingImageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>Screen blank</span>
                    ) : previewContent ? (
                      <>
                        <p style={{ color: textColor, fontSize: previewFontSize, fontFamily: previewFontFamily, textAlign: 'center', lineHeight: 1.5, whiteSpace: 'pre-line', padding: '0 8%', textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>{previewLines}</p>
                        {previewContent.reference && (
                          <span style={{ color: textColor, opacity: 0.7, fontSize: '0.5rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>{previewContent.reference}</span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', letterSpacing: '0.1em' }}>Tap a slide to begin</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingTop: 2 }}>
            <button style={TAB_STYLE(controllerTab === 'slides')} onClick={() => setControllerTab('slides')}>Slides</button>
            <button style={TAB_STYLE(controllerTab === 'look')} onClick={() => setControllerTab('look')}>Look</button>
            <button style={TAB_STYLE(controllerTab === 'screens')} onClick={() => setControllerTab('screens')}>Screens</button>
            <button style={TAB_STYLE(controllerTab === 'scripture')} onClick={() => setControllerTab('scripture')}>Scripture</button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto" style={{ background: '#09090b' }}>

            {/* ── SLIDES TAB ── */}
            {controllerTab === 'slides' && (
              <div style={{ padding: '12px 16px' }}>

                {/* Songs in this service — tap to jump */}
                {playlist && playlist.length > 1 && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Song {songIdx + 1} of {playlist.length}
                    </p>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
                      {playlist.map((p, i) => {
                        const active = i === songIdx
                        return (
                          <button
                            key={i}
                            onClick={() => goToSong(i)}
                            aria-current={active ? 'true' : undefined}
                            style={{
                              flexShrink: 0, maxWidth: 200, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 6,
                              background: active ? 'rgba(35,102,83,0.3)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${active ? 'rgba(140,201,179,0.6)' : 'rgba(255,255,255,0.1)'}`,
                              color: active ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: active ? 600 : 500,
                            }}
                          >
                            <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>{i + 1}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Tap a slide to show it · section names are only shown to you
                </p>

                {slides.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>No lyrics added yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, paddingBottom: 6 }}>
                    {slides.map((slide, i) => {
                      const previewLines = slide.content.split('\n').filter((l: string) => l.trim()).join('\n')
                      const translationPreview = (translationPerSlide[i] ?? '').split('\n').filter((l: string) => l.trim()).join('\n')
                      const isActive = currentIdx === i && !blank
                      const hasNote = !!getNote(slide.label)
                      const notesOpen = notesOpenIdx === i
                      return (
                        <div key={i} style={{ minWidth: 0 }}>
                          <button
                            onClick={() => showSlide(i)}
                            style={{
                              width: '100%', textAlign: 'left', padding: '10px 10px 10px 12px', borderRadius: 12,
                              border: `1px solid ${isActive ? 'rgba(140,201,179,0.6)' : 'rgba(255,255,255,0.1)'}`,
                              background: isActive ? 'rgba(35,102,83,0.25)' : 'rgba(255,255,255,0.05)',
                              display: 'block', cursor: 'pointer', overflow: 'hidden', wordBreak: 'break-word',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 6 }}>
                              <p style={{ color: isActive ? '#b5dccd' : 'rgba(255,255,255,0.35)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {i + 1}{slide.label ? ` · ${slide.label}` : ''}
                              </p>
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  if (notesOpen) { setNotesOpenIdx(null) }
                                  else { setNotesOpenIdx(i); setNotesDraft(getNote(slide.label)) }
                                }}
                                title="Notes"
                                aria-label="Slide notes"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', margin: '-6px -6px -6px 0', color: hasNote ? '#8cc9b3' : 'rgba(255,255,255,0.25)', fontSize: '0.75rem', flexShrink: 0, lineHeight: 1 }}
                              >
                                ✎
                              </button>
                            </div>
                            <p style={{ color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)', fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.45, whiteSpace: 'pre-line' }}>
                              {previewLines || slide.content}
                            </p>
                            {translationPreview && (
                              <p style={{ marginTop: 5, color: isActive ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontWeight: 300, lineHeight: 1.4, whiteSpace: 'pre-line' }}>
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

            {/* ── LOOK TAB ── background, text, languages */}
            {controllerTab === 'look' && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Background</p>
                  <BackgroundPicker value={background} onChange={changeBackground} />
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
                          localStorage.setItem('songsaver-font-size', key)
                          rebroadcast({ fontSizeKey: key })
                        }}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: 10,
                          border: `1px solid ${fontSizeKey === key ? 'rgba(140,201,179,0.6)' : 'rgba(255,255,255,0.12)'}`,
                          background: fontSizeKey === key ? 'rgba(35,102,83,0.3)' : 'rgba(255,255,255,0.06)',
                          color: fontSizeKey === key ? '#b5dccd' : 'rgba(255,255,255,0.5)',
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
                          localStorage.setItem('songsaver-font-family', f.id)
                          rebroadcast({ fontFamily: f.id })
                        }}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: 10,
                          border: `1px solid ${fontFamily === f.id ? 'rgba(140,201,179,0.6)' : 'rgba(255,255,255,0.12)'}`,
                          background: fontFamily === f.id ? 'rgba(35,102,83,0.3)' : 'rgba(255,255,255,0.06)',
                          color: fontFamily === f.id ? '#b5dccd' : 'rgba(255,255,255,0.5)',
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
                      { color: '#111111', label: 'Black' },
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
                          localStorage.setItem('songsaver-text-color', color)
                          rebroadcast({ textColor: color })
                        }}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', background: color,
                          border: textColor === color ? '2.5px solid #8cc9b3' : '2px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer', flexShrink: 0,
                          transform: textColor === color ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.15s',
                          boxShadow: textColor === color ? '0 0 10px rgba(140,201,179,0.5)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Language selection — always visible */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Languages</p>
                  {activeAvailableLyrics.length < 2 ? (
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', lineHeight: 1.5, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                      This song only has one language entry. To display two languages simultaneously, go to the song and add a second language in the lyrics editor.
                    </p>
                  ) : (
                    <>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', marginBottom: 12 }}>
                      Choose which two languages to display simultaneously.
                    </p>

                    {/* Primary */}
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Primary (top)</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {activeAvailableLyrics.map(l => {
                        const isSelected = primaryLangId === l.id || (!primaryLangId && activeAvailableLyrics[0]?.id === l.id)
                        return (
                          <button
                            key={l.id}
                            onClick={() => {
                              setPrimaryLangId(l.id)
                              if (secondaryLangId === l.id) setSecondaryLangId(null)
                            }}
                            style={{
                              padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                              background: isSelected ? 'rgba(140,201,179,0.3)' : 'rgba(255,255,255,0.06)',
                              border: `1px solid ${isSelected ? 'rgba(140,201,179,0.55)' : 'rgba(255,255,255,0.12)'}`,
                              color: isSelected ? '#b5dccd' : 'rgba(255,255,255,0.5)',
                              transition: 'all 0.15s',
                            }}
                          >
                            {LANGUAGE_NAMES[l.language] ?? l.language}
                          </button>
                        )
                      })}
                    </div>

                    {/* Secondary */}
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Secondary (below, optional)</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <button
                        onClick={() => setSecondaryLangId(null)}
                        style={{
                          padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                          background: !secondaryLangId ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${!secondaryLangId ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                          color: !secondaryLangId ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                          transition: 'all 0.15s',
                        }}
                      >
                        None
                      </button>
                      {activeAvailableLyrics
                        .filter(l => l.id !== (primaryLangId ?? activeAvailableLyrics[0]?.id))
                        .map(l => {
                          const isSelected = secondaryLangId === l.id
                          return (
                            <button
                              key={l.id}
                              onClick={() => setSecondaryLangId(isSelected ? null : l.id)}
                              style={{
                                padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                                background: isSelected ? 'rgba(140,201,179,0.3)' : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${isSelected ? 'rgba(140,201,179,0.55)' : 'rgba(255,255,255,0.12)'}`,
                                color: isSelected ? '#b5dccd' : 'rgba(255,255,255,0.5)',
                                transition: 'all 0.15s',
                              }}
                            >
                              {LANGUAGE_NAMES[l.language] ?? l.language}
                            </button>
                          )
                        })}
                    </div>
                    </>
                  )}
                </div>

              </div>
            )}

            {/* ── SCREENS TAB ── connecting screens, and what shows when blank */}
            {controllerTab === 'screens' && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Projector URL */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Projector Screen</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <code style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayUrl}</code>
                    <button onClick={() => setShowQr(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: showQr ? '#8cc9b3' : 'rgba(255,255,255,0.5)', flexShrink: 0 }} title="QR code">
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button onClick={copyUrl} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#34d399' : 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button onClick={openDisplay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8cc9b3', flexShrink: 0 }}>
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
                      background: inlineOpen ? 'rgba(140,201,179,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${inlineOpen ? 'rgba(140,201,179,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: inlineOpen ? '#8cc9b3' : 'rgba(255,255,255,0.55)',
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
                      <button onClick={joinSession} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(140,201,179,0.3)', border: '1px solid rgba(140,201,179,0.5)', color: '#b5dccd', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
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
                    <button onClick={() => stageUrl && window.open(stageUrl, 'songsaver-stage', 'width=1024,height=600,menubar=no,toolbar=no')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8cc9b3', flexShrink: 0 }}>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '4px 0 -8px' }}>When the screen is blank</p>
                {/* Holding slide image */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Holding Slide</p>
                  <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.65rem', marginBottom: 8 }}>Shown when screen is blanked. Paste an image or video URL — videos loop automatically.</p>
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
                      style={{ padding: '7px 12px', borderRadius: 10, flexShrink: 0, background: 'rgba(140,201,179,0.3)', border: '1px solid rgba(140,201,179,0.5)', color: '#b5dccd', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
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

                {/* Screensaver */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Screensaver</p>
                  <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.65rem', marginBottom: 12 }}>Scripture verses cycle on the projector when the screen is blank and no holding image is set.</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>Enable screensaver</span>
                    <button
                      onClick={() => {
                        const next = !screensaverEnabled
                        setScreensaverEnabled(next)
                        localStorage.setItem('songsaver-screensaver-on', String(next))
                        rebroadcast({ screensaverEnabled: next })
                      }}
                      style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', background: screensaverEnabled ? 'rgba(35,102,83,0.75)' : 'rgba(255,255,255,0.12)', flexShrink: 0 }}
                    >
                      <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: screensaverEnabled ? 22 : 2 }} />
                    </button>
                  </div>
                  {screensaverEnabled && (
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Verse duration</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[5, 8, 12, 20].map(secs => (
                          <button
                            key={secs}
                            onClick={() => { setScreensaverInterval(secs); localStorage.setItem('songsaver-screensaver-secs', String(secs)); rebroadcast({ screensaverInterval: secs }) }}
                            style={{
                              flex: 1, padding: '7px 4px', borderRadius: 10, fontSize: '0.72rem', cursor: 'pointer',
                              background: screensaverInterval === secs ? 'rgba(35,102,83,0.3)' : 'rgba(255,255,255,0.06)',
                              border: `1px solid ${screensaverInterval === secs ? 'rgba(140,201,179,0.6)' : 'rgba(255,255,255,0.12)'}`,
                              color: screensaverInterval === secs ? '#b5dccd' : 'rgba(255,255,255,0.5)',
                              transition: 'all 0.15s',
                            }}
                          >
                            {secs}s
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SCRIPTURE TAB ── */}
            {controllerTab === 'scripture' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Browse / Search toggle */}
                <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                  {(['browse', 'search'] as const).map(t => (
                    <button key={t} onClick={() => setScriptureTab(t)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: `1px solid ${scriptureTab === t ? 'rgba(140,201,179,0.5)' : 'rgba(255,255,255,0.1)'}`, background: scriptureTab === t ? 'rgba(35,102,83,0.25)' : 'rgba(255,255,255,0.05)', color: scriptureTab === t ? '#b5dccd' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, textTransform: 'capitalize' }}>
                      {t === 'browse' ? 'Browse' : 'Search'}
                    </button>
                  ))}
                </div>

                {/* Browse: three-column picker */}
                {scriptureTab === 'browse' && (
                  <div style={{ display: 'flex', flex: 1, minHeight: 260, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {/* Book */}
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.07)', minWidth: 0 }}>
                      <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Book</p>
                      </div>
                      <div ref={bookColRef} style={{ flex: 1, overflowY: 'auto' }}>
                        {BIBLE_BOOKS.map(book => (
                          <button key={book.id} data-id={book.id}
                            onClick={() => {
                              if (browseBook?.id === book.id) return
                              setBrowseBook(book); setBrowseChapter(1); setBrowseVerseIdx(null)
                              setLoadingVerses(true); setBrowseVerses([])
                              fetch(`/api/bible?op=verses&chapter=${encodeURIComponent(`${book.id}.1`)}`).then(r => r.json()).then(d => { setBrowseVerses(d.verses ?? []) }).finally(() => setLoadingVerses(false))
                            }}
                            style={{ width: '100%', textAlign: 'left', padding: '14px 10px', fontSize: '0.85rem', background: browseBook?.id === book.id ? 'rgba(35,102,83,0.2)' : 'transparent', color: browseBook?.id === book.id ? '#b5dccd' : 'rgba(255,255,255,0.6)', fontWeight: browseBook?.id === book.id ? 600 : 400, border: 'none', borderLeft: `2px solid ${browseBook?.id === book.id ? '#236653' : 'transparent'}`, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {book.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Chapter */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.07)', minWidth: 0 }}>
                      <div style={{ padding: '6px 4px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', flexShrink: 0 }}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Ch</p>
                      </div>
                      <div ref={chColRef} style={{ flex: 1, overflowY: 'auto' }}>
                        {browseBook
                          ? Array.from({ length: browseBook.chapters }, (_, i) => i + 1).map(ch => (
                              <button key={ch} data-id={String(ch)}
                                onClick={() => {
                                  if (!browseBook || browseChapter === ch) return
                                  setBrowseChapter(ch); setBrowseVerseIdx(null)
                                  setLoadingVerses(true); setBrowseVerses([])
                                  fetch(`/api/bible?op=verses&chapter=${encodeURIComponent(`${browseBook.id}.${ch}`)}`).then(r => r.json()).then(d => { setBrowseVerses(d.verses ?? []) }).finally(() => setLoadingVerses(false))
                                }}
                                style={{ width: '100%', textAlign: 'center', padding: '14px 0', fontSize: '0.9rem', background: browseChapter === ch ? 'rgba(35,102,83,0.2)' : 'transparent', color: browseChapter === ch ? '#b5dccd' : 'rgba(255,255,255,0.6)', fontWeight: browseChapter === ch ? 600 : 400, border: 'none', cursor: 'pointer' }}>
                                {ch}
                              </button>
                            ))
                          : <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', textAlign: 'center', padding: '8px 0' }}>—</p>
                        }
                      </div>
                    </div>
                    {/* Verse */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <div style={{ padding: '6px 4px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', flexShrink: 0 }}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Vs</p>
                      </div>
                      <div ref={vsColRef} style={{ flex: 1, overflowY: 'auto' }}>
                        {loadingVerses
                          ? <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', textAlign: 'center', padding: '8px 0' }}>…</p>
                          : browseVerses.map((v, idx) => {
                              const num = v.reference.split(':')[1] ?? v.id.split('.').pop()
                              return (
                                <button key={v.id} data-id={v.reference}
                                  onClick={async () => {
                                    setBrowseVerseIdx(idx); setLoadingPassage(true)
                                    try {
                                      const r = await fetch(`/api/bible?op=passage&id=${encodeURIComponent(v.id)}`)
                                      const d = await r.json()
                                      if (d.text && d.reference) sendVerse(d.reference, d.text)
                                    } finally { setLoadingPassage(false) }
                                  }}
                                  style={{ width: '100%', textAlign: 'center', padding: '14px 0', fontSize: '0.9rem', background: browseVerseIdx === idx ? 'rgba(35,102,83,0.2)' : 'transparent', color: browseVerseIdx === idx ? '#b5dccd' : 'rgba(255,255,255,0.6)', fontWeight: browseVerseIdx === idx ? 600 : 400, border: 'none', cursor: 'pointer' }}>
                                  {num}
                                </button>
                              )
                            })
                        }
                      </div>
                    </div>
                  </div>
                )}

                {/* Search */}
                {scriptureTab === 'search' && (
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                      <button onClick={searchScripture} disabled={scriptureSearching}
                        style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(140,201,179,0.3)', border: '1px solid rgba(140,201,179,0.5)', color: '#b5dccd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {scriptureSearching
                          ? <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                          : <Search style={{ width: 16, height: 16 }} />}
                      </button>
                    </div>
                    {scriptureResults.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {scriptureResults.map((v, i) => (
                          <button key={i} onClick={() => sendVerse(v.reference, v.text)}
                            style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 14, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ color: '#8cc9b3', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{v.reference}</span>
                            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', lineHeight: 1.5, fontWeight: 300 }}>
                              {v.text.length > 200 ? v.text.slice(0, 200) + '…' : v.text}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {scriptureError && <p style={{ color: '#f87171', fontSize: '0.72rem', textAlign: 'center' }}>{scriptureError}</p>}
                    {!scriptureSearching && !scriptureError && scriptureResults.length === 0 && scriptureQuery && (
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', textAlign: 'center', padding: '12px 0' }}>No results</p>
                    )}
                  </div>
                )}

                {loadingPassage && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textAlign: 'center', padding: '8px 0' }}>Loading verse…</p>}
              </div>
            )}
          </div>

          {/* Navigation bar */}
          <div
            className="px-4 pt-3 pb-4 border-t border-[rgba(255,255,255,0.08)] flex items-center gap-2"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={goPrev}
              disabled={!canGoPrev}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] disabled:opacity-25 hover:bg-[rgba(255,255,255,0.1)] transition-all text-sm font-medium"
            >
              <ChevronLeft className="w-5 h-5" /> Prev
            </button>

            <button
              onClick={blank ? revealCurrent : showBlank}
              className={cn(
                'w-14 h-14 flex items-center justify-center rounded-2xl border transition-all duration-150',
                blank
                  ? 'bg-accent-600 border-accent-500'
                  : 'bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)]'
              )}
              title={blank ? 'Show slide' : 'Blank screen'}
            >
              <EyeOff className={cn('w-5 h-5', blank ? 'text-[#fff]' : 'text-[rgba(255,255,255,0.6)]')} />
            </button>

            <button
              onClick={goNext}
              disabled={!canGoNext}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] disabled:opacity-25 hover:bg-[rgba(255,255,255,0.1)] transition-all text-sm font-medium"
            >
              {currentIdx === null ? 'Start' : currentIdx === slides.length - 1 && playlist && songIdx < playlist.length - 1 ? 'Next song' : 'Next'} <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <style dangerouslySetInnerHTML={{ __html: `@keyframes live-pulse{0%,100%{opacity:1}50%{opacity:0.4}}` }} />
          <PresentationStyles />
        </div>,
        document.body
      )}
    </>
  )
}
