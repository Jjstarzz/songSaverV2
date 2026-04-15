'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { Tv2 } from 'lucide-react'

const BACKGROUNDS: Record<string, string> = {
  dark:    'radial-gradient(ellipse at 50% 60%, #1a1a2e 0%, #000 70%)',
  purple:  'radial-gradient(ellipse at 50% 60%, #2d1b69 0%, #06030f 70%)',
  blue:    'radial-gradient(ellipse at 50% 60%, #0c1445 0%, #000 70%)',
  green:   'radial-gradient(ellipse at 50% 60%, #0a2e1a 0%, #000 70%)',
  teal:    'radial-gradient(ellipse at 50% 60%, #0a2a2a 0%, #000 70%)',
  crimson: 'radial-gradient(ellipse at 50% 60%, #2a0a0a 0%, #000 70%)',
}

interface SlideState {
  blank: boolean
  section: string
  lines: string
  title: string
  background: string
}

const INITIAL: SlideState = { blank: true, section: '', lines: '', title: '', background: 'dark' }

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
        // Fade out → update → fade in
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

  const bgStyle = BACKGROUNDS[slide.background] ?? BACKGROUNDS.dark
  const lines = slide.lines ? slide.lines.split('\n').filter(Boolean) : []
  // Scale font size based on line count
  const fontSize =
    lines.length <= 2 ? '5.5vw' :
    lines.length <= 4 ? '4.5vw' :
    lines.length <= 6 ? '3.8vw' : '3.2vw'

  if (!code) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 text-sm">
        No presentation code — open this page from the Present controller.
      </div>
    )
  }

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center cursor-pointer select-none transition-[background] duration-700"
      style={{ background: bgStyle }}
      onClick={requestFullscreen}
    >
      {!connected ? (
        /* Waiting screen */
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mx-auto">
            <Tv2 className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-white/25 text-sm tracking-wide">Waiting for presenter…</p>
          <p className="text-white/15 text-xs">Click anywhere for fullscreen</p>
          <p className="text-white/10 text-[10px] font-mono mt-4">Code: {code}</p>
        </div>
      ) : (
        /* Slide content */
        <div
          className="w-full h-full flex flex-col items-center justify-center px-[8%] relative"
          style={{ opacity: fadeIn ? 1 : 0, transition: 'opacity 0.15s ease-in-out' }}
        >
          {!slide.blank && (
            <>
              {slide.section && (
                <p
                  className="absolute top-12 left-1/2 -translate-x-1/2 text-white/30 font-bold tracking-[0.5em] uppercase whitespace-nowrap"
                  style={{ fontSize: '0.7rem' }}
                >
                  {slide.section}
                </p>
              )}

              <p
                className="text-white text-center font-light whitespace-pre-line"
                style={{
                  fontSize,
                  lineHeight: 1.55,
                  letterSpacing: '0.01em',
                  textShadow: '0 2px 32px rgba(0,0,0,0.9), 0 0 80px rgba(255,255,255,0.04)',
                  maxWidth: '90%',
                }}
              >
                {slide.lines}
              </p>

              {slide.title && (
                <p
                  className="absolute bottom-10 right-12 text-white/20 italic"
                  style={{ fontSize: '0.75rem' }}
                >
                  {slide.title}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
