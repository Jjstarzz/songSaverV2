'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, EyeOff, ExternalLink, Copy, Check, Monitor, Tv2, QrCode,
  Search, ChevronLeft, ChevronRight,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useSupabase } from '@/hooks/useSupabase'
import { BIBLE_BOOKS } from '@/lib/bibleData'
import { cn } from '@/lib/utils'
import { FONT_OPTIONS } from '@/lib/presentationBackgrounds'
import { presentChannelName, REQUEST_STATE_EVENT, SLIDE_EVENT, type PresentState } from '@/lib/presentationProtocol'
import { BackgroundLayer, PresentationStyles } from './BackgroundLayer'
import { BackgroundPicker } from './BackgroundPicker'

interface VerseResult { reference: string; text: string }
interface VerseRef    { id: string; reference: string }

export function ScriptureController({ defaultOpen = false, onClose }: { defaultOpen?: boolean; onClose?: () => void } = {}) {
  const supabase = useSupabase()

  // Open / close
  const [open, setOpenState]      = useState(defaultOpen)
  const setOpen = (v: boolean) => { setOpenState(v); if (!v) onClose?.() }
  const [inlineOpen, setInlineOpen] = useState(false)

  // Presentation core
  const [code, setCode]         = useState('')
  const [blank, setBlank]       = useState(true)
  const [copied, setCopied]     = useState(false)
  const [showQr, setShowQr]     = useState(false)
  const [activeVerse, setActiveVerse] = useState<VerseResult | null>(null)

  // Display settings
  const [background,  setBackground]  = useState('dark')
  const [fontSizeKey, setFontSizeKey] = useState('md')
  const [fontFamily,  setFontFamily]  = useState('sans')
  const [textColor,   setTextColor]   = useState('#ffffff')
  const [holdingImageUrl,  setHoldingImageUrl]  = useState<string>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('songsaver-holding-image') ?? '' : ''
  )
  const [holdingInputVal, setHoldingInputVal] = useState('')

  // Controller tabs
  const [controllerTab, setControllerTab] = useState<'verses' | 'settings'>('verses')

  // Collapsible panels (join only)
  const [showJoin, setShowJoin] = useState(false)
  const [joinInput, setJoinInput] = useState('')

  // Browse
  const [tab, setTab]                   = useState<'browse' | 'search'>('browse')
  const [browseBook, setBrowseBook]     = useState<typeof BIBLE_BOOKS[0] | null>(null)
  const [browseChapter, setBrowseChapter] = useState<number | null>(null)
  const [browseVerses, setBrowseVerses]   = useState<VerseRef[]>([])
  const [loadingVerses,  setLoadingVerses]  = useState(false)
  const [browseVerseIdx, setBrowseVerseIdx] = useState<number | null>(null)
  const [loadingPassage, setLoadingPassage] = useState(false)

  // Search
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState<VerseResult[]>([])
  const [searching,   setSearching]   = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchIdx,   setSearchIdx]   = useState<number | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const bookColRef = useRef<HTMLDivElement>(null)
  const chColRef   = useRef<HTMLDivElement>(null)
  const vsColRef   = useRef<HTMLDivElement>(null)

  // ── Session code ──
  useEffect(() => {
    if (!open) return
    let sc = sessionStorage.getItem('songsaver-present-code')
    if (!sc) {
      sc = Math.random().toString(36).slice(2, 8).toUpperCase()
      sessionStorage.setItem('songsaver-present-code', sc)
    }
    setCode(sc)
    setBlank(true)
    const ch = connectChannel(sc)
    return () => { supabase.removeChannel(ch); channelRef.current = null }
    // connectChannel only reads refs; re-running on its identity would reconnect every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supabase])

  // ── Auto-scroll columns ──
  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>, id: string) => {
    const col = ref.current
    const el  = col?.querySelector<HTMLElement>(`[data-id="${id}"]`)
    if (!col || !el) return
    col.scrollTo({ top: el.offsetTop - col.offsetTop - col.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' })
  }
  useEffect(() => { if (browseBook)    scrollTo(bookColRef, browseBook.id)        }, [browseBook])
  useEffect(() => { if (browseChapter) scrollTo(chColRef,   String(browseChapter)) }, [browseChapter])
  useEffect(() => { if (activeVerse)   scrollTo(vsColRef,   activeVerse.reference) }, [activeVerse])

  // ── Broadcast helpers ──
  // Last state sent — re-sent when a projector/stage screen (re)connects
  const lastStateRef = useRef<PresentState | null>(null)
  const send = (state: PresentState) => {
    lastStateRef.current = state
    channelRef.current?.send({ type: 'broadcast', event: SLIDE_EVENT, payload: state })
  }
  function connectChannel(sessionCode: string) {
    const ch = supabase.channel(presentChannelName(sessionCode), { config: { broadcast: { ack: false } } })
    ch.on('broadcast', { event: REQUEST_STATE_EVENT }, () => {
      if (lastStateRef.current) ch.send({ type: 'broadcast', event: SLIDE_EVENT, payload: lastStateRef.current })
    })
    ch.subscribe()
    channelRef.current = ch
    return ch
  }

  const verseState = (verse: VerseResult | null, isBlank: boolean, overrides: Partial<PresentState> = {}): PresentState => ({
    blank: isBlank,
    lines: verse?.text ?? '',
    title: '',
    reference: verse?.reference ?? '',
    section: verse?.reference ?? '',
    upNext: null,
    background, fontSizeKey, fontFamily, textColor, holdingImageUrl,
    ...overrides,
  })

  const sendVerse = (verse: VerseResult) => {
    setActiveVerse(verse)
    setBlank(false)
    send(verseState(verse, false))
  }

  const showBlank = () => {
    setBlank(true)
    send(verseState(activeVerse, true))
  }

  const revealCurrent = () => { if (activeVerse) sendVerse(activeVerse) }

  const rebroadcast = (overrides: Partial<PresentState> = {}) => {
    send(verseState(activeVerse, blank || !activeVerse, overrides))
  }

  const changeBackground = (bg: string) => {
    setBackground(bg)
    rebroadcast({ background: bg })
  }

  // ── Browse ──
  const fetchVerses = useCallback(async (bookId: string, ch: number) => {
    setLoadingVerses(true)
    setBrowseVerses([])
    setBrowseVerseIdx(null)
    try {
      const res  = await fetch(`/api/bible?op=verses&chapter=${encodeURIComponent(`${bookId}.${ch}`)}`)
      const data = await res.json()
      setBrowseVerses(data.verses ?? [])
    } catch { /* ignore */ }
    setLoadingVerses(false)
  }, [])

  const pickBook = (book: typeof BIBLE_BOOKS[0]) => {
    if (browseBook?.id === book.id) return
    setBrowseBook(book); setBrowseChapter(1); setBrowseVerseIdx(null)
    fetchVerses(book.id, 1)
  }

  const pickChapter = (ch: number) => {
    if (!browseBook || browseChapter === ch) return
    setBrowseChapter(ch); setBrowseVerseIdx(null)
    fetchVerses(browseBook.id, ch)
  }

  const pickVerse = async (idx: number) => {
    const vr = browseVerses[idx]
    if (!vr) return
    setBrowseVerseIdx(idx)
    setLoadingPassage(true)
    try {
      const res  = await fetch(`/api/bible?op=passage&id=${encodeURIComponent(vr.id)}`)
      const data = await res.json()
      if (data.text && data.reference) sendVerse({ reference: data.reference, text: data.text })
    } catch { /* ignore */ }
    setLoadingPassage(false)
  }

  // ── Search ──
  const doSearch = async () => {
    if (!query.trim()) return
    setSearching(true); setResults([]); setSearchError(''); setSearchIdx(null)
    try {
      const res  = await fetch(`/api/bible?op=search&q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (!res.ok) setSearchError(data.error ?? 'Search failed')
      else if (!data.verses?.length) setSearchError('No results found')
      else setResults(data.verses)
    } catch { setSearchError('Could not reach Bible API') }
    setSearching(false)
  }

  // ── Prev / Next ──
  const canPrev = tab === 'browse'
    ? browseVerseIdx !== null && browseVerseIdx > 0
    : searchIdx !== null && searchIdx > 0

  const canNext = tab === 'browse'
    ? browseVerseIdx !== null && browseVerseIdx < browseVerses.length - 1
    : searchIdx !== null && searchIdx < results.length - 1

  const prevVerse = () => {
    if (tab === 'browse' && browseVerseIdx !== null && browseVerseIdx > 0)
      pickVerse(browseVerseIdx - 1)
    else if (tab === 'search' && searchIdx !== null && searchIdx > 0) {
      const i = searchIdx - 1; setSearchIdx(i); sendVerse(results[i])
    }
  }

  const nextVerse = () => {
    if (tab === 'browse' && browseVerseIdx !== null && browseVerseIdx < browseVerses.length - 1)
      pickVerse(browseVerseIdx + 1)
    else if (tab === 'search' && searchIdx !== null && searchIdx < results.length - 1) {
      const i = searchIdx + 1; setSearchIdx(i); sendVerse(results[i])
    }
  }

  // ── Display URL ──
  const displayUrl = typeof window !== 'undefined' && code
    ? `${window.location.origin}/present?code=${code}` : ''

  const copyUrl = async () => {
    await navigator.clipboard.writeText(displayUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const openDisplay = () =>
    window.open(displayUrl, 'songsaver-present', 'width=1280,height=720,menubar=no,toolbar=no')

  const joinSession = () => {
    const trimmed = joinInput.trim().toUpperCase()
    if (!trimmed) return
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    sessionStorage.setItem('songsaver-present-code', trimmed)
    setCode(trimmed)
    connectChannel(trimmed)
    setBlank(true)
    setActiveVerse(null)
    setShowJoin(false)
    setJoinInput('')
  }

  // ── Inline display ──
  const inlineFontFam  = FONT_OPTIONS.find(f => f.id === fontFamily)?.family ?? FONT_OPTIONS[0].family

  // ── Trigger button ──
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-accent-500/15 text-accent-300 border border-accent-500/20 hover:bg-accent-500/25 transition-colors"
      >
        <Monitor className="w-3.5 h-3.5" />
        Present
      </button>
    )
  }

  // ── Inline fullscreen ──
  const inlineDisplay = inlineOpen ? createPortal(
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;600&display=swap');` }} />
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#000' }}
        onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
      >
        <BackgroundLayer id={background} />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8%', position: 'relative', zIndex: 1 }}>
          {blank || !activeVerse ? (
            <>
              {blank && holdingImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={holdingImageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
              )}
              <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.875rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                Tap a verse to display
              </p>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p style={{ color: textColor, textAlign: 'center', fontWeight: 300, fontSize: '5vw', lineHeight: 1.55, whiteSpace: 'pre-wrap', fontFamily: inlineFontFam, textShadow: '0 2px 32px rgba(0,0,0,0.9), 0 0 80px rgba(255,255,255,0.04)' }}>
                  {activeVerse.text}
                </p>
                <p style={{ marginTop: '2vw', color: textColor, opacity: 0.7, fontSize: '1.6vw', fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: inlineFontFam }}>
                  {activeVerse.reference}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Bottom strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.06)', zIndex: 1 }}>
          <button onClick={prevVerse} disabled={!canPrev} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '12px 0', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.8rem', opacity: !canPrev ? 0.25 : 1 }}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Prev
          </button>
          <button onClick={blank ? revealCurrent : showBlank} style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 14, border: 'none', background: blank ? '#236653' : 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: blank ? '0 0 20px rgba(35,102,83,0.4)' : 'none' }}>
            <EyeOff style={{ width: 18, height: 18, color: blank ? '#fff' : 'rgba(255,255,255,0.5)' }} />
          </button>
          <button onClick={nextVerse} disabled={!canNext} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '12px 0', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.8rem', opacity: !canNext ? 0.25 : 1 }}>
            Next <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
          <button onClick={() => setInlineOpen(false)} style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>
      </div>
    </>,
    document.body
  ) : null

  // ── Tab style helper (matches PresentationController) ──
  const TAB_STYLE = (active: boolean) => ({
    flex: 1, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer',
    color: active ? '#8cc9b3' : 'rgba(255,255,255,0.4)',
    fontSize: '0.72rem', fontWeight: active ? 700 : 500,
    borderBottom: `2px solid ${active ? '#236653' : 'transparent'}`,
    transition: 'all 0.15s', letterSpacing: '0.05em',
  })

  // ── Full controller overlay ──
  return (
    <>
      {inlineDisplay}
      {createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#09090b', color: '#ffffff' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', paddingTop: 'max(1rem, env(safe-area-inset-top))', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 2 }}>Scripture Presenter</p>
              <p style={{ color: '#ffffff', fontWeight: 600, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeVerse ? activeVerse.reference : 'No verse selected'}
              </p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close presenter" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview panel */}
          {(() => {
            const previewLines = activeVerse?.text.split('\n').filter(Boolean).slice(0, 3).join('\n') ?? ''
            const previewFontFamily = FONT_OPTIONS.find(f => f.id === fontFamily)?.family ?? FONT_OPTIONS[0].family
            return (
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: 420, margin: '0 auto', aspectRatio: '16 / 9', maxHeight: 180, overflow: 'hidden', background: '#000' }}>
                  <BackgroundLayer id={background} still />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                    {blank ? (
                      holdingImageUrl
                        ? <img src={holdingImageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>Screen blank</span>
                    ) : activeVerse ? (
                      <>
                        <span style={{ color: '#8cc9b3', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 2 }}>{activeVerse.reference}</span>
                        <p style={{ color: textColor, fontSize: `${(0.62 * (fontSizeKey === 'sm' ? 0.72 : fontSizeKey === 'lg' ? 1.3 : fontSizeKey === 'xl' ? 1.65 : 1)).toFixed(2)}rem`, fontFamily: previewFontFamily, textAlign: 'center', lineHeight: 1.45, whiteSpace: 'pre-line', padding: '0 8%', textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>{previewLines}</p>
                      </>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', letterSpacing: '0.1em' }}>Tap a verse to begin</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingTop: 2 }}>
            <button style={TAB_STYLE(controllerTab === 'verses')} onClick={() => setControllerTab('verses')}>Verses</button>
            <button style={TAB_STYLE(controllerTab === 'settings')} onClick={() => setControllerTab('settings')}>Settings</button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto" style={{ background: '#09090b' }}>

            {/* ── VERSES TAB ── */}
            {controllerTab === 'verses' && (
              <>
                {/* Search bar */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="text" placeholder="e.g. John 3:16 or peace" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.85rem', outline: 'none' }} />
                    <button onClick={doSearch} disabled={searching} style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(140,201,179,0.3)', border: '1px solid rgba(140,201,179,0.5)', color: '#b5dccd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {searching
                        ? <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                        : <Search style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                  {searchError && <p style={{ color: '#f87171', fontSize: '0.7rem', textAlign: 'center', marginTop: 8 }}>{searchError}</p>}
                </div>

                {/* Search results */}
                {results.length > 0 ? (
                  <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {results.map((v, i) => (
                      <button key={i} onClick={() => { setSearchIdx(i); sendVerse(v) }}
                        style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 12, cursor: 'pointer', background: searchIdx === i ? 'rgba(35,102,83,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${searchIdx === i ? 'rgba(140,201,179,0.5)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ color: '#8cc9b3', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{v.reference}</span>
                        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', lineHeight: 1.45, fontWeight: 300 }}>{v.text.length > 160 ? v.text.slice(0, 160) + '…' : v.text}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Three-column Book/Chapter/Verse picker — fills remaining space */
                  <div style={{ display: 'flex', flex: 1, borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: 0, height: '100%' }}>

                    {/* Book column */}
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.07)', minWidth: 0 }}>
                      <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>BOOK</p>
                      </div>
                      <div ref={bookColRef} style={{ flex: 1, overflowY: 'auto' }}>
                        {BIBLE_BOOKS.map(book => (
                          <button key={book.id} data-id={book.id} onClick={() => pickBook(book)}
                            style={{ width: '100%', textAlign: 'left', padding: '10px 10px', fontSize: '0.82rem', background: browseBook?.id === book.id ? 'rgba(35,102,83,0.2)' : 'transparent', color: browseBook?.id === book.id ? '#b5dccd' : 'rgba(255,255,255,0.6)', fontWeight: browseBook?.id === book.id ? 600 : 400, border: 'none', borderLeft: `2px solid ${browseBook?.id === book.id ? '#236653' : 'transparent'}`, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {book.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chapter column */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.07)', minWidth: 0 }}>
                      <div style={{ padding: '6px 4px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', flexShrink: 0 }}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Chapter</p>
                      </div>
                      <div ref={chColRef} style={{ flex: 1, overflowY: 'auto' }}>
                        {browseBook
                          ? Array.from({ length: browseBook.chapters }, (_, i) => i + 1).map(ch => (
                              <button key={ch} data-id={String(ch)} onClick={() => pickChapter(ch)}
                                style={{ width: '100%', textAlign: 'center', padding: '10px 0', fontSize: '0.88rem', background: browseChapter === ch ? 'rgba(35,102,83,0.2)' : 'transparent', color: browseChapter === ch ? '#b5dccd' : 'rgba(255,255,255,0.6)', fontWeight: browseChapter === ch ? 600 : 400, border: 'none', cursor: 'pointer' }}>
                                {ch}
                              </button>
                            ))
                          : <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', textAlign: 'center', padding: '8px 0' }}>—</p>
                        }
                      </div>
                    </div>

                    {/* Verse column */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <div style={{ padding: '6px 4px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', flexShrink: 0 }}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Verse</p>
                      </div>
                      <div ref={vsColRef} style={{ flex: 1, overflowY: 'auto' }}>
                        {loadingVerses
                          ? <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', textAlign: 'center', padding: '8px 0' }}>…</p>
                          : browseVerses.map((v, idx) => {
                              const num = v.reference.split(':')[1] ?? v.id.split('.').pop()
                              return (
                                <button key={v.id} data-id={v.reference} onClick={() => pickVerse(idx)}
                                  style={{ width: '100%', textAlign: 'center', padding: '10px 0', fontSize: '0.88rem', background: browseVerseIdx === idx ? 'rgba(35,102,83,0.2)' : 'transparent', color: browseVerseIdx === idx ? '#b5dccd' : 'rgba(255,255,255,0.6)', fontWeight: browseVerseIdx === idx ? 600 : 400, border: 'none', cursor: 'pointer' }}>
                                  {num}
                                </button>
                              )
                            })
                        }
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading passage */}
                {loadingPassage && (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textAlign: 'center', padding: '12px 0' }}>Loading verse…</p>
                )}
              </>
            )}

            {/* ── SETTINGS TAB ── */}
            {controllerTab === 'settings' && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Projector URL */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Projector Screen URL</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <code style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayUrl}</code>
                    <button onClick={() => setShowQr(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: showQr ? '#8cc9b3' : 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
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
                    <div style={{ marginTop: 12, padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ background: '#ffffff', borderRadius: 12, padding: 12 }}>
                        <QRCode value={displayUrl} size={180} bgColor="#ffffff" fgColor="#09090b" level="M" />
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', textAlign: 'center' }}>Scan to open on the projector screen</p>
                    </div>
                  )}

                  <button onClick={() => setInlineOpen(v => !v)} style={{ marginTop: 10, width: '100%', padding: '10px 16px', borderRadius: 12, background: inlineOpen ? 'rgba(140,201,179,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${inlineOpen ? 'rgba(140,201,179,0.45)' : 'rgba(255,255,255,0.1)'}`, color: inlineOpen ? '#8cc9b3' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Tv2 style={{ width: 14, height: 14 }} />
                    {inlineOpen ? 'Presenting on this screen ✓' : 'Present on this screen'}
                  </button>

                  <button
                    onClick={() => setShowJoin(v => !v)}
                    style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', padding: '4px 0', display: 'block', width: '100%', textAlign: 'center' }}
                  >
                    {showJoin ? '✕ Cancel' : '+ Join an existing session'}
                  </button>
                  {showJoin && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        value={joinInput}
                        onChange={e => setJoinInput(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && joinSession()}
                        placeholder="Enter session code"
                        maxLength={8}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.82rem', outline: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                      />
                      <button
                        onClick={joinSession}
                        style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(140,201,179,0.3)', border: '1px solid rgba(140,201,179,0.5)', color: '#b5dccd', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, flexShrink: 0 }}
                      >
                        Join
                      </button>
                    </div>
                  )}
                </div>

                {/* Stage display URL */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Stage Monitor URL</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <code style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof window !== 'undefined' && code ? `${window.location.origin}/stage?code=${code}` : ''}
                    </code>
                    <button
                      onClick={() => { if (typeof window !== 'undefined' && code) navigator.clipboard.writeText(`${window.location.origin}/stage?code=${code}`) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}
                      title="Copy stage URL"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (typeof window !== 'undefined' && code) window.open(`${window.location.origin}/stage?code=${code}`, 'songsaver-stage', 'width=1024,height=600,menubar=no,toolbar=no') }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8cc9b3', flexShrink: 0 }}
                      title="Open stage monitor"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Background */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Background</p>
                  <BackgroundPicker value={background} onChange={changeBackground} />
                </div>

                {/* Font & Size — always visible */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Text Size</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    {(['sm', 'md', 'lg', 'xl'] as const).map(key => (
                      <button key={key} onClick={() => { setFontSizeKey(key); rebroadcast({ fontSizeKey: key }) }}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 10, border: `1px solid ${fontSizeKey === key ? 'rgba(140,201,179,0.6)' : 'rgba(255,255,255,0.12)'}`, background: fontSizeKey === key ? 'rgba(35,102,83,0.3)' : 'rgba(255,255,255,0.06)', color: fontSizeKey === key ? '#b5dccd' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: key === 'sm' ? '0.7rem' : key === 'md' ? '0.8rem' : key === 'lg' ? '0.9rem' : '1rem', fontWeight: 600 }}>
                        {key.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Font Style</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    {FONT_OPTIONS.map(f => (
                      <button key={f.id} onClick={() => { setFontFamily(f.id); rebroadcast({ fontFamily: f.id }) }}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 10, border: `1px solid ${fontFamily === f.id ? 'rgba(140,201,179,0.6)' : 'rgba(255,255,255,0.12)'}`, background: fontFamily === f.id ? 'rgba(35,102,83,0.3)' : 'rgba(255,255,255,0.06)', color: fontFamily === f.id ? '#b5dccd' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.72rem', fontFamily: f.family, fontWeight: 500 }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Text Colour</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[
                      { color: '#ffffff', label: 'White' }, { color: '#fef9c3', label: 'Cream' },
                      { color: '#fde68a', label: 'Yellow' }, { color: '#bfdbfe', label: 'Blue' },
                      { color: '#fbcfe8', label: 'Pink' },   { color: '#bbf7d0', label: 'Mint' },
                    ].map(({ color, label }) => (
                      <button key={color} title={label} onClick={() => { setTextColor(color); rebroadcast({ textColor: color }) }}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: color, border: textColor === color ? '2.5px solid #8cc9b3' : '2px solid rgba(255,255,255,0.2)', cursor: 'pointer', transform: textColor === color ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.15s', boxShadow: textColor === color ? '0 0 10px rgba(140,201,179,0.5)' : 'none' }} />
                    ))}
                  </div>
                </div>

                {/* Holding slide image */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Holding Slide Image</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', marginBottom: 8 }}>Shown when screen is blanked. Paste an image URL.</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="url" placeholder="https://..." defaultValue={holdingImageUrl} onChange={e => setHoldingInputVal(e.target.value)}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.72rem', outline: 'none' }} />
                    <button onClick={() => { const u = holdingInputVal.trim(); setHoldingImageUrl(u); localStorage.setItem('songsaver-holding-image', u) }}
                      style={{ padding: '7px 12px', borderRadius: 10, background: 'rgba(140,201,179,0.3)', border: '1px solid rgba(140,201,179,0.5)', color: '#b5dccd', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Set</button>
                    {holdingImageUrl && (
                      <button onClick={() => { setHoldingImageUrl(''); setHoldingInputVal(''); localStorage.removeItem('songsaver-holding-image') }}
                        style={{ padding: '7px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.72rem' }}>✕</button>
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
          </div>

          {/* Bottom nav bar */}
          <div className="px-4 pt-3 pb-4 border-t border-[rgba(255,255,255,0.08)] flex items-center gap-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <button onClick={prevVerse} disabled={!canPrev}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] disabled:opacity-25 hover:bg-[rgba(255,255,255,0.1)] transition-all text-sm font-medium">
              <ChevronLeft className="w-5 h-5" /> Prev
            </button>
            <button onClick={blank ? revealCurrent : showBlank}
              className={cn('w-14 h-14 flex items-center justify-center rounded-2xl border transition-all duration-150', blank ? 'bg-accent-600 border-accent-500' : 'bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.08)]')}>
              <EyeOff className={cn('w-5 h-5', blank ? 'text-[#fff]' : 'text-[rgba(255,255,255,0.6)]')} />
            </button>
            <button onClick={nextVerse} disabled={!canNext}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] disabled:opacity-25 hover:bg-[rgba(255,255,255,0.1)] transition-all text-sm font-medium">
              Next <ChevronRight className="w-5 h-5" />
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
