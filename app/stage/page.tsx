'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { Maximize2, Minimize2, Minus, Plus } from 'lucide-react'
import { presentChannelName, REQUEST_STATE_EVENT, SLIDE_EVENT, type PresentState } from '@/lib/presentationProtocol'

/**
 * Stage confidence monitor for the band and singers. Shows the current
 * section (with its name), what's coming next, and the next song — never
 * mirrored to the congregation's projector.
 */
function StageDisplay() {
  const params = useSearchParams()
  const code = params.get('code') ?? ''
  const supabase = useSupabase()
  const [state, setState] = useState<PresentState | null>(null)
  const [connected, setConnected] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scale, setScale] = useState(1)
  const [now, setNow] = useState('')

  useEffect(() => {
    try { const v = Number(localStorage.getItem('songsaver-stage-scale')); if (v) setScale(v) } catch { /* ignore */ }
    const tick = () => setNow(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    tick()
    const t = setInterval(tick, 15000)
    const fs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', fs)
    return () => { clearInterval(t); document.removeEventListener('fullscreenchange', fs) }
  }, [])

  const changeScale = (d: number) => setScale((s) => {
    const n = Math.min(1.8, Math.max(0.6, +(s + d).toFixed(2)))
    try { localStorage.setItem('songsaver-stage-scale', String(n)) } catch { /* ignore */ }
    return n
  })

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {})
    else document.exitFullscreen?.().catch(() => {})
  }, [])

  useEffect(() => {
    if (!code) return
    const ch = supabase.channel(presentChannelName(code), { config: { broadcast: { ack: false } } })
    ch.on('broadcast', { event: SLIDE_EVENT }, ({ payload }) => {
      setConnected(true)
      setState(payload as PresentState)
    }).subscribe((status) => {
      // Ask the controller for the current slide when this screen (re)connects
      if (status === 'SUBSCRIBED') ch.send({ type: 'broadcast', event: REQUEST_STATE_EVENT, payload: {} })
    })
    return () => { supabase.removeChannel(ch) }
  }, [code, supabase])

  if (!code) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white/60 text-base p-6 text-center">
        Open this screen from the presenter&apos;s Screens tab (it needs a session code).
      </div>
    )
  }

  const blank = !state || state.blank
  const sectionName = state?.reference || state?.section || ''
  const next = state?.upNext ?? null
  const nextIsNewSong = !!next && !!state && next.title !== state.title && !!next.title

  return (
    <div className="w-full h-full bg-black text-white flex flex-col font-sans" style={{ fontSize: `${scale}rem` }}>
      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-white/10 bg-[#0b0b0f] shrink-0 text-sm">
        <span className="text-white/70 uppercase tracking-[0.2em] text-xs">Stage · {code}</span>
        <span className={connected ? 'text-emerald-400' : 'text-amber-400'}>{connected ? '● Live' : '○ Waiting for presenter…'}</span>
        <span className="ml-auto tabular-nums text-white text-lg font-semibold">{now}</span>
        <button onClick={() => changeScale(-0.1)} aria-label="Smaller text" className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:bg-white/10"><Minus className="w-4 h-4" /></button>
        <button onClick={() => changeScale(0.1)} aria-label="Larger text" className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:bg-white/10"><Plus className="w-4 h-4" /></button>
        <button onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:bg-white/10">
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Now */}
        <section aria-label="Now on screen" className="flex-[2] min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-white/10">
          <div className="px-6 pt-4 flex items-baseline gap-3">
            <span className="text-[0.8em] font-bold uppercase tracking-[0.25em] text-violet-300">{blank ? 'Screen blank' : sectionName || 'Now'}</span>
            {state?.title && <span className="text-[0.85em] text-white/60 truncate">{state.title}</span>}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-6 py-4">
            {blank ? (
              <p className="text-white/40 text-[1.4em] tracking-wide">— nothing on the projector —</p>
            ) : (
              <div className="text-center">
                <p className="whitespace-pre-line font-semibold leading-snug" style={{ fontSize: 'clamp(1.6em, 4.6vw, 4.2em)' }}>{state!.lines}</p>
                {state?.translationLines?.trim() && (
                  <p className="mt-4 whitespace-pre-line text-white/70 leading-snug" style={{ fontSize: 'clamp(1.1em, 2.8vw, 2.4em)' }}>{state.translationLines}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Next */}
        <section aria-label="Up next" className="flex-1 min-h-0 flex flex-col">
          {nextIsNewSong && (
            <div className="px-6 py-3 bg-violet-600 text-white">
              <p className="text-[0.75em] font-bold uppercase tracking-[0.25em]">Next song</p>
              <p className="text-[1.5em] font-semibold leading-tight">{next!.title}</p>
            </div>
          )}
          <div className="px-6 pt-4">
            <span className="text-[0.8em] font-bold uppercase tracking-[0.25em] text-white/60">
              {next ? (next.section || (nextIsNewSong ? 'Opening' : 'Next')) : 'Next'}
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-6 py-4">
            {next ? (
              <p className="whitespace-pre-line text-white/85 text-center leading-snug" style={{ fontSize: 'clamp(1.1em, 2.6vw, 2.2em)' }}>{next.lines}</p>
            ) : (
              <p className="text-white/40 text-[1.1em]">{state ? 'End of the set' : '—'}</p>
            )}
          </div>
        </section>
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
