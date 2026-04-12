'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Square, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const MIN_BPM = 40
const MAX_BPM = 240

export function Metronome() {
  const [bpm, setBpm] = useState(100)
  const [running, setRunning] = useState(false)
  const [beat, setBeat] = useState(0)
  const [beatsPerBar, setBeatsPerBar] = useState(4)
  const [flash, setFlash] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const beatRef = useRef(0)

  const playClick = useCallback((isAccent: boolean) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.value = isAccent ? 1800 : 1200
    gain.gain.setValueAtTime(isAccent ? 0.8 : 0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.08)
  }, [])

  const start = useCallback(() => {
    beatRef.current = 0
    setBeat(0)
    setFlash(true)
    setTimeout(() => setFlash(false), 80)
    playClick(true)

    intervalRef.current = setInterval(() => {
      beatRef.current = (beatRef.current + 1) % beatsPerBar
      setBeat(beatRef.current)
      const isAccent = beatRef.current === 0
      setFlash(true)
      setTimeout(() => setFlash(false), 80)
      playClick(isAccent)
    }, (60 / bpm) * 1000)

    setRunning(true)
  }, [bpm, beatsPerBar, playClick])

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    setBeat(0)
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Restart when BPM changes while running
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (running) {
      stop()
      setTimeout(start, 50)
    }
  }, [bpm]) // intentionally only bpm — we want to restart only when BPM changes

  const adjustBpm = (delta: number) => {
    setBpm((prev) => Math.max(MIN_BPM, Math.min(MAX_BPM, prev + delta)))
  }

  const handleTap = (() => {
    const taps: number[] = []
    return () => {
      const now = Date.now()
      taps.push(now)
      if (taps.length > 4) taps.shift()
      if (taps.length >= 2) {
        const intervals = taps.slice(1).map((t, i) => t - taps[i])
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
        setBpm(Math.round(60000 / avg))
      }
    }
  })()

  return (
    <div className="space-y-6">
      {/* Beat visualizer */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: beatsPerBar }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-3 h-3 rounded-full transition-all duration-75',
              running && beat === i
                ? i === 0 ? 'bg-accent-400 scale-125 shadow-glow-sm' : 'bg-white/70 scale-110'
                : 'bg-white/20'
            )}
          />
        ))}
      </div>

      {/* BPM display */}
      <div className="text-center">
        <div className={cn(
          'relative inline-block transition-all duration-75',
          flash && running ? 'scale-105' : 'scale-100'
        )}>
          <span className="text-7xl font-black text-white tabular-nums">{bpm}</span>
        </div>
        <p className="text-sm text-white/40 mt-1 font-medium tracking-widest uppercase">BPM</p>
      </div>

      {/* BPM controls */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => adjustBpm(-10)} className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.10] transition-all active:scale-95 text-xs font-bold">-10</button>
        <button onClick={() => adjustBpm(-1)} className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.10] transition-all active:scale-95">
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          onClick={handleTap}
          className="px-5 py-2.5 rounded-xl bg-white/[0.08] border border-white/10 text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.12] transition-all active:scale-95"
        >
          Tap
        </button>
        <button onClick={() => adjustBpm(1)} className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.10] transition-all active:scale-95">
          <ChevronUp className="w-4 h-4" />
        </button>
        <button onClick={() => adjustBpm(10)} className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.10] transition-all active:scale-95 text-xs font-bold">+10</button>
      </div>

      {/* BPM slider */}
      <div className="px-2">
        <input
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={(e) => setBpm(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-accent-500"
        />
        <div className="flex justify-between text-xs text-white/30 mt-1">
          <span>{MIN_BPM}</span>
          <span>{MAX_BPM}</span>
        </div>
      </div>

      {/* Time signature */}
      <div className="flex items-center justify-center gap-3">
        <p className="text-xs text-white/40 uppercase tracking-widest">Beats per bar</p>
        <div className="flex gap-2">
          {[2, 3, 4, 6].map((n) => (
            <button
              key={n}
              onClick={() => setBeatsPerBar(n)}
              className={cn(
                'w-9 h-9 rounded-lg text-sm font-bold border transition-all duration-200',
                beatsPerBar === n
                  ? 'bg-accent-600 border-accent-500 text-white'
                  : 'bg-white/[0.06] border-white/10 text-white/50 hover:text-white'
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Play/Stop */}
      <div className="flex justify-center">
        <button
          onClick={running ? stop : start}
          className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-glow-purple active:scale-95',
            running
              ? 'bg-red-500/20 border-2 border-red-500/50 text-red-400 hover:bg-red-500/30'
              : 'bg-accent-600 border-2 border-accent-400/30 text-white hover:bg-accent-500'
          )}
        >
          {running ? <Square className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
        </button>
      </div>
    </div>
  )
}
