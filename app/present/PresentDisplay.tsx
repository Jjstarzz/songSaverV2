'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { Tv2 } from 'lucide-react'
import {
  BG_STATIC, LIVE_BG_IDS, VIDEO_BG_IDS, VIDEO_BG_URLS, ANIMATION_CSS,
  FONT_FAMILY_MAP, SIZE_MULTIPLIERS,
} from '@/lib/presentationBackgrounds'

const SCREENSAVER_VERSES = [
  { text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.', ref: 'John 3:16' },
  { text: 'Be still, and know that I am God.', ref: 'Psalm 46:10' },
  { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13' },
  { text: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.', ref: 'Proverbs 3:5–6' },
  { text: 'Come to me, all you who are weary and burdened, and I will give you rest.', ref: 'Matthew 11:28' },
  { text: 'The LORD is my shepherd; I shall not want.', ref: 'Psalm 23:1' },
  { text: '"For I know the plans I have for you," declares the LORD, "plans to prosper you and not to harm you, plans to give you hope and a future."', ref: 'Jeremiah 29:11' },
  { text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.', ref: 'Philippians 4:6' },
  { text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.', ref: 'Romans 8:28' },
  { text: 'This is the day the LORD has made; let us rejoice and be glad in it.', ref: 'Psalm 118:24' },
  { text: 'Greater love has no one than this: to lay down one\'s life for one\'s friends.', ref: 'John 15:13' },
  { text: 'The LORD your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.', ref: 'Zephaniah 3:17' },
]

interface SlideState {
  blank: boolean
  section: string
  lines: string
  title: string
  background: string
  fontSizeKey?: string
  fontFamily?: string
  textColor?: string
  holdingImageUrl?: string
  translationLines?: string
}

const INITIAL: SlideState = {
  blank: true, section: '', lines: '', title: '',
  background: 'dark', fontSizeKey: 'md', fontFamily: 'sans',
}

export function PresentDisplay() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code') ?? ''
  const supabase = useSupabase()
  const [slide, setSlide] = useState<SlideState>(INITIAL)
  const [connected, setConnected] = useState(false)
  const [fadeIn, setFadeIn] = useState(true)
  const [ssIdx, setSsIdx] = useState(0)
  const [ssVisible, setSsVisible] = useState(true)
  const ssTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const showScreensaver = connected && slide.blank && !slide.holdingImageUrl

  useEffect(() => {
    if (!showScreensaver) {
      if (ssTimerRef.current) { clearInterval(ssTimerRef.current); ssTimerRef.current = null }
      setSsIdx(0)
      setSsVisible(true)
      return
    }
    ssTimerRef.current = setInterval(() => {
      setSsVisible(false)
      setTimeout(() => {
        setSsIdx(i => (i + 1) % SCREENSAVER_VERSES.length)
        setSsVisible(true)
      }, 600)
    }, 8000)
    return () => { if (ssTimerRef.current) clearInterval(ssTimerRef.current) }
  }, [showScreensaver])

  useEffect(() => {
    if (!code) return
    const channel = supabase.channel(`present-${code}`, { config: { broadcast: { ack: false } } })
    channel
      .on('broadcast', { event: 'slide' }, ({ payload }) => {
        setConnected(true)
        setFadeIn(false)
        setTimeout(() => {
          setSlide(payload as SlideState)
          setFadeIn(true)
        }, 150)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [code, supabase])

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {})
  }

  // Background
  const bgId = slide.background ?? 'dark'
  const isLive = LIVE_BG_IDS.has(bgId)
  const isVideo = VIDEO_BG_IDS.has(bgId)
  const videoUrl = isVideo ? VIDEO_BG_URLS[bgId] : null
  const bgStyle = (isLive || isVideo) ? undefined : { background: BG_STATIC[bgId] ?? BG_STATIC.dark }
  const bgClass = isLive ? `live-${bgId}` : ''

  // Typography — scale down slightly when showing both languages
  const hasDual = !!(slide.translationLines && slide.translationLines.trim())
  const lines = slide.lines ? slide.lines.split('\n').filter(Boolean) : []
  const baseVw =
    lines.length <= 2 ? 5.5 :
    lines.length <= 4 ? 4.5 :
    lines.length <= 6 ? 3.8 : 3.2
  const dualScale = hasDual ? 0.72 : 1
  const multiplier = SIZE_MULTIPLIERS[slide.fontSizeKey ?? 'md'] ?? 1
  const fontSize = `${(baseVw * multiplier * dualScale).toFixed(2)}vw`
  const fontFamily = FONT_FAMILY_MAP[slide.fontFamily ?? 'sans'] ?? FONT_FAMILY_MAP.sans

  if (!code) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 text-sm">
        No presentation code — open this page from the Present controller.
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;600&display=swap');
        ${ANIMATION_CSS}
      `}</style>

      <div
        className={`w-full h-full flex flex-col items-center justify-center cursor-pointer select-none relative ${bgClass}`}
        style={bgStyle}
        onClick={requestFullscreen}
      >
        {videoUrl && (
          <video
            key={bgId}
            autoPlay loop muted playsInline preload="auto"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
            src={videoUrl}
          />
        )}
        {!connected ? (
          <div className="text-center space-y-3 relative z-10">
            <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mx-auto">
              <Tv2 className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-white/25 text-sm tracking-wide">Waiting for presenter…</p>
            <p className="text-white/15 text-xs">Click anywhere for fullscreen</p>
            <p className="text-white/10 text-[10px] font-mono mt-4">Code: {code}</p>
          </div>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center px-[8%] relative z-10"
            style={{ opacity: fadeIn ? 1 : 0, transition: 'opacity 0.15s ease-in-out' }}
          >
            {slide.blank && slide.holdingImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.holdingImageUrl}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
              />
            )}
            {showScreensaver && (
              <div
                className="flex flex-col items-center justify-center w-full h-full px-[10%]"
                style={{ opacity: ssVisible ? 1 : 0, transition: 'opacity 0.6s ease-in-out' }}
              >
                <p
                  className="text-center whitespace-pre-line"
                  style={{
                    fontSize: '3.2vw',
                    fontFamily,
                    fontWeight: 300,
                    lineHeight: 1.65,
                    letterSpacing: '0.01em',
                    color: 'rgba(255,255,255,0.82)',
                    textShadow: '0 2px 40px rgba(0,0,0,0.9)',
                    maxWidth: '80%',
                    marginBottom: '2.4vw',
                  }}
                >
                  {SCREENSAVER_VERSES[ssIdx].text}
                </p>
                <p
                  style={{
                    fontSize: '1.1vw',
                    fontFamily,
                    fontWeight: 500,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.35)',
                  }}
                >
                  — {SCREENSAVER_VERSES[ssIdx].ref}
                </p>
              </div>
            )}
            {!slide.blank && (
              <>
                {slide.section && (
                  <p
                    className="absolute top-12 left-1/2 -translate-x-1/2 text-white/30 font-bold tracking-[0.5em] uppercase whitespace-nowrap"
                    style={{ fontSize: '0.7rem', fontFamily }}
                  >
                    {slide.section}
                  </p>
                )}

                {/* Main text */}
                <p
                  className="text-center whitespace-pre-line"
                  style={{
                    fontSize,
                    fontFamily,
                    fontWeight: 400,
                    lineHeight: 1.5,
                    letterSpacing: '0.01em',
                    color: slide.textColor ?? '#ffffff',
                    textShadow: '0 2px 32px rgba(0,0,0,0.9), 0 0 80px rgba(255,255,255,0.04)',
                    maxWidth: '90%',
                    marginBottom: hasDual ? '1.2vw' : 0,
                  }}
                >
                  {slide.lines}
                </p>

                {/* Translation / transliteration */}
                {hasDual && (
                  <p
                    className="text-center whitespace-pre-line"
                    style={{
                      fontSize,
                      fontFamily,
                      fontWeight: 400,
                      lineHeight: 1.5,
                      letterSpacing: '0.01em',
                      color: slide.textColor ? slide.textColor + 'cc' : 'rgba(255,255,255,0.8)',
                      textShadow: '0 2px 20px rgba(0,0,0,0.8)',
                      maxWidth: '90%',
                    }}
                  >
                    {slide.translationLines}
                  </p>
                )}

                {slide.title && (
                  <p
                    className="absolute bottom-10 right-12 text-white/20 italic"
                    style={{ fontSize: '0.75rem', fontFamily }}
                  >
                    {slide.title}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
