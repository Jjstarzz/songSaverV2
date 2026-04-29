'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { Tv2 } from 'lucide-react'
import {
  BG_STATIC, LIVE_BG_IDS, VIDEO_BG_IDS, VIDEO_BG_URLS, ANIMATION_CSS,
  FONT_FAMILY_MAP, SIZE_MULTIPLIERS,
} from '@/lib/presentationBackgrounds'

interface SlideState {
  blank: boolean
  section: string
  lines: string
  title: string
  background: string
  fontSizeKey?: string
  fontFamily?: string
  textColor?: string
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

  // Typography
  const lines = slide.lines ? slide.lines.split('\n').filter(Boolean) : []
  const baseVw =
    lines.length <= 2 ? 5.5 :
    lines.length <= 4 ? 4.5 :
    lines.length <= 6 ? 3.8 : 3.2
  const multiplier = SIZE_MULTIPLIERS[slide.fontSizeKey ?? 'md'] ?? 1
  const fontSize = `${(baseVw * multiplier).toFixed(2)}vw`
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
      {/* Inject animations + load Playfair Display for the Elegant option */}
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

                <p
                  className="text-center whitespace-pre-line"
                  style={{
                    fontSize,
                    fontFamily,
                    fontWeight: 300,
                    lineHeight: 1.55,
                    letterSpacing: '0.01em',
                    color: slide.textColor ?? '#ffffff',
                    textShadow: '0 2px 32px rgba(0,0,0,0.9), 0 0 80px rgba(255,255,255,0.04)',
                    maxWidth: '90%',
                  }}
                >
                  {slide.lines}
                </p>

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
