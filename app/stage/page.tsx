'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { Maximize2, Minimize2 } from 'lucide-react'

interface SlideInfo {
  section: string
  lines: string
  title: string
  translationLines?: string
}

interface StageState {
  blank: boolean
  current: SlideInfo
  upNext: SlideInfo | null
}

const EMPTY: SlideInfo = { section: '', lines: '', title: '' }

function StageDisplay() {
  const params = useSearchParams()
  const code = params.get('code') ?? ''
  const supabase = useSupabase()
  const [state, setState] = useState<StageState>({ blank: true, current: EMPTY, upNext: null })
  const [connected, setConnected] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!code) return
    const ch = supabase.channel(`present-${code}`, { config: { broadcast: { ack: false } } })
    ch.on('broadcast', { event: 'slide' }, ({ payload }) => {
      setConnected(true)
      setState({
        blank: payload.blank ?? true,
        current: { section: payload.section ?? '', lines: payload.lines ?? '', title: payload.title ?? '', translationLines: payload.translationLines ?? '' },
        upNext: payload.upNext ?? null,
      })
    }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [code, supabase])

  if (!code) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#000', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
        No code — add ?code=XXXXXX to the URL
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a0a', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#111', flexShrink: 0 }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>Stage Display · {code}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: connected ? '#34d399' : '#f87171' }}>
            {connected ? '● Connected' : '○ Waiting…'}
          </span>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Split panels */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Current — 2/3 width */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', borderRight: '2px solid rgba(255,255,255,0.06)' }}>
          <div style={{ padding: '6px 18px', background: 'rgba(124,58,237,0.15)', borderBottom: '1px solid rgba(139,92,246,0.25)', flexShrink: 0 }}>
            <p style={{ color: '#a78bfa', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Now on screen</p>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6%', overflowY: 'auto' }}>
            {state.blank ? (
              <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '1rem', letterSpacing: '0.15em' }}>SCREEN IS BLANK</p>
            ) : (
              <>
                {state.current.section && (
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>
                    {state.current.section}
                  </p>
                )}
                <p style={{ color: '#ffffff', fontSize: 'clamp(1.4rem, 4.5vw, 3rem)', fontWeight: 300, lineHeight: 1.65, textAlign: 'center', whiteSpace: 'pre-line' }}>
                  {state.current.lines}
                </p>
                {state.current.translationLines && state.current.translationLines.trim() && (
                  <>
                    <div style={{ width: 36, height: 1, background: 'rgba(255,255,255,0.12)', margin: '14px auto' }} />
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(1rem, 3.2vw, 2rem)', fontWeight: 300, lineHeight: 1.65, textAlign: 'center', whiteSpace: 'pre-line' }}>
                      {state.current.translationLines}
                    </p>
                  </>
                )}
                {state.current.title && (
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', marginTop: 28, fontStyle: 'italic' }}>
                    {state.current.title}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Up next — 1/3 width */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', opacity: 0.5 }}>
          <div style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Up next</p>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8%' }}>
            {state.upNext ? (
              <>
                {state.upNext.section && (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 14, textAlign: 'center' }}>
                    {state.upNext.section}
                  </p>
                )}
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(0.9rem, 2.5vw, 1.6rem)', fontWeight: 300, lineHeight: 1.65, textAlign: 'center', whiteSpace: 'pre-line' }}>
                  {state.upNext.lines}
                </p>
                {state.upNext.title && (
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', marginTop: 16, fontStyle: 'italic' }}>
                    {state.upNext.title}
                  </p>
                )}
              </>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.85rem', textAlign: 'center' }}>End of presentation</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StagePage() {
  return (
    <Suspense>
      <StageDisplay />
    </Suspense>
  )
}
