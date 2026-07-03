'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Play, Square, Plus, Minus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'

// ── Music constants ──────────────────────────────────────────────────────────

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const BASE_FREQ: Record<string, number> = {
  C: 261.63, 'C#': 277.18, D: 293.66, 'D#': 311.13,
  E: 329.63, F: 349.23, 'F#': 369.99, G: 392.00,
  'G#': 415.30, A: 440.00, 'A#': 466.16, B: 493.88,
}

const MAJOR_SCALE  = [0, 2, 4, 5, 7, 9, 11]
const MINOR_SCALE  = [0, 2, 3, 5, 7, 8, 10]
const MAJOR_CHORD  = [0, 4, 7, 12]
const MINOR_CHORD  = [0, 3, 7, 12]

// Piano layout (one octave, 280-wide SVG)
const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const BLACK_KEY_X: Record<string, number> = {
  'C#': 27, 'D#': 67, 'F#': 147, 'G#': 187, 'A#': 227,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getScaleNotes(root: string, minor: boolean): string[] {
  const intervals = minor ? MINOR_SCALE : MAJOR_SCALE
  const idx = KEYS.indexOf(root)
  return intervals.map(i => KEYS[(idx + i) % 12])
}

function semToFreq(root: string, semitones: number): number {
  return BASE_FREQ[root] * Math.pow(2, semitones / 12)
}

// ── Audio ────────────────────────────────────────────────────────────────────

function playPad(ctx: AudioContext, root: string, minor: boolean, time: number) {
  const chordIntervals = minor ? MINOR_CHORD : MAJOR_CHORD
  // Bass note an octave below + chord + top octave
  const voices = [-12, ...chordIntervals]

  const master = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 2200
  filter.Q.value = 0.4
  master.connect(filter)
  filter.connect(ctx.destination)

  voices.forEach((semi, vi) => {
    const freq = semToFreq(root, semi)
    const isBass = vi === 0
    const vol = isBass ? 0.20 : 0.10

    // 3 slightly detuned oscillators per voice → thick pad texture
    ;[-8, 0, 8].forEach(detune => {
      const osc = ctx.createOscillator()
      const g   = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.detune.value = detune

      // Slow-attack pad envelope
      g.gain.setValueAtTime(0, time)
      g.gain.linearRampToValueAtTime(vol, time + 0.35)
      g.gain.setValueAtTime(vol, time + 0.35)
      g.gain.linearRampToValueAtTime(0, time + 4.0)

      osc.connect(g)
      g.connect(master)
      osc.start(time)
      osc.stop(time + 4.1)
    })
  })
}

function playClick(ctx: AudioContext, time: number, accent: boolean) {
  const osc = ctx.createOscillator()
  const g   = ctx.createGain()
  osc.frequency.value = accent ? 1100 : 800
  g.gain.setValueAtTime(accent ? 0.7 : 0.4, time)
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.055)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.06)
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const [selectedKey, setSelectedKey] = useState('C')
  const [isMinor,     setIsMinor]     = useState(false)
  const [bpm,         setBpm]         = useState(80)
  const [isPlaying,   setIsPlaying]   = useState(false)
  const [activeBeat,  setActiveBeat]  = useState(-1)

  // Audio refs
  const ctxRef       = useRef<AudioContext | null>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextNoteRef  = useRef(0)
  const beatRef      = useRef(0)

  // Mutable refs so scheduler always reads latest values without restarting
  const bpmRef   = useRef(bpm)
  const keyRef   = useRef(selectedKey)
  const minorRef = useRef(isMinor)
  useEffect(() => { bpmRef.current   = bpm        }, [bpm])
  useEffect(() => { keyRef.current   = selectedKey }, [selectedKey])
  useEffect(() => { minorRef.current = isMinor     }, [isMinor])

  const stopScheduler = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setIsPlaying(false)
    setActiveBeat(-1)
    beatRef.current = 0
  }, [])

  const schedule = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return

    while (nextNoteRef.current < ctx.currentTime + 0.1) {
      const beat = beatRef.current
      const t    = nextNoteRef.current

      playClick(ctx, t, beat === 0)
      if (beat === 0) playPad(ctx, keyRef.current, minorRef.current, t)

      // Visual beat dot update (fire slightly before audio)
      const fireIn = Math.max(0, (t - ctx.currentTime) * 1000 - 30)
      setTimeout(() => setActiveBeat(beat), fireIn)

      nextNoteRef.current += 60 / bpmRef.current
      beatRef.current = (beat + 1) % 4
    }

    timerRef.current = setTimeout(schedule, 25)
  }, []) // stable — reads state via refs

  const startScheduler = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') ctx.resume()

    beatRef.current    = 0
    nextNoteRef.current = ctx.currentTime + 0.05
    setIsPlaying(true)
    schedule()
  }, [schedule])

  // Cleanup on unmount
  useEffect(() => () => { stopScheduler() }, [stopScheduler])

  // Tap tempo
  const tapTimesRef = useRef<number[]>([])
  const handleTap = () => {
    const now = Date.now()
    tapTimesRef.current = [...tapTimesRef.current.filter(t => now - t < 3000), now]
    if (tapTimesRef.current.length >= 2) {
      const gaps = tapTimesRef.current.slice(1).map((t, i) => t - tapTimesRef.current[i])
      const avg  = gaps.reduce((a, b) => a + b, 0) / gaps.length
      setBpm(Math.round(Math.min(220, Math.max(40, 60000 / avg))))
    }
  }

  const scaleNotes = getScaleNotes(selectedKey, isMinor)

  return (
    <div className="pb-32">
      <PageHeader title="Key Reference" subtitle="Scale + metronome practice tool" />

      <div className="px-4 space-y-4">

        {/* ── Key picker ── */}
        <div className="glass-card p-4 space-y-3">
          <p className="section-label">Key</p>
          <div className="grid grid-cols-6 gap-1.5">
            {KEYS.map(k => (
              <button
                key={k}
                onClick={() => setSelectedKey(k)}
                className={cn(
                  'py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150',
                  selectedKey === k
                    ? 'bg-gradient-to-b from-accent-500 to-accent-700 border-accent-500 text-white shadow-[0_0_12px_-2px_rgba(124,92,252,0.6)]'
                    : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:text-white hover:border-white/20'
                )}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Major / Minor */}
          <div className="flex gap-2 pt-1">
            {(['Major', 'Minor'] as const).map(m => (
              <button
                key={m}
                onClick={() => setIsMinor(m === 'Minor')}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-semibold border transition-all duration-150',
                  (m === 'Minor') === isMinor
                    ? 'bg-gradient-to-b from-accent-500 to-accent-700 border-accent-500 text-white'
                    : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:text-white'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* ── Piano diagram ── */}
        <div className="glass-card p-4 space-y-3">
          <p className="section-label">
            {selectedKey} {isMinor ? 'Minor' : 'Major'} — scale notes
          </p>

          <div className="flex justify-center px-2">
            <svg viewBox="0 0 280 122" className="w-full max-w-sm drop-shadow-md">
              {/* White keys */}
              {WHITE_NOTES.map((note, i) => {
                const inScale = scaleNotes.includes(note)
                const isRoot  = note === selectedKey
                return (
                  <g key={note}>
                    <rect
                      x={i * 40 + 1} y={1} width={38} height={118} rx={5}
                      fill={isRoot ? '#7c3aed' : inScale ? '#4c1d95' : 'rgba(255,255,255,0.93)'}
                      stroke={isRoot ? '#a78bfa' : 'rgba(0,0,0,0.25)'}
                      strokeWidth={1}
                    />
                    <text
                      x={i * 40 + 20} y={110}
                      textAnchor="middle" fontSize="10"
                      fill={inScale || isRoot ? 'rgba(255,255,255,0.9)' : '#555'}
                      fontWeight={isRoot ? '700' : '500'}
                    >
                      {note}
                    </text>
                  </g>
                )
              })}

              {/* Black keys (drawn on top) */}
              {Object.entries(BLACK_KEY_X).map(([note, x]) => {
                const inScale = scaleNotes.includes(note)
                const isRoot  = note === selectedKey
                return (
                  <g key={note}>
                    <rect
                      x={x} y={1} width={26} height={76} rx={3}
                      fill={isRoot ? '#7c3aed' : inScale ? '#5b21b6' : '#12121e'}
                      stroke={isRoot ? '#a78bfa' : inScale ? '#6d28d9' : 'rgba(255,255,255,0.08)'}
                      strokeWidth={1}
                    />
                    {(inScale || isRoot) && (
                      <text
                        x={x + 13} y={69}
                        textAnchor="middle" fontSize="7.5"
                        fill="rgba(255,255,255,0.85)" fontWeight="600"
                      >
                        {note}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Scale note pills */}
          <div className="flex flex-wrap gap-1.5 justify-center pt-1">
            {scaleNotes.map((note, i) => (
              <span
                key={i}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-semibold border',
                  i === 0
                    ? 'bg-accent-600 border-accent-500 text-white'
                    : 'bg-accent-500/15 border-accent-500/25 text-accent-300'
                )}
              >
                {note}
              </span>
            ))}
          </div>
        </div>

        {/* ── Tempo + Play ── */}
        <div className="glass-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="section-label">Tempo</p>
            <button
              onClick={handleTap}
              className="text-xs font-medium text-accent-400 border border-accent-500/30 bg-accent-500/10 px-3 py-1.5 rounded-lg hover:bg-accent-500/20 transition-colors"
            >
              Tap Tempo
            </button>
          </div>

          {/* BPM display */}
          <div className="flex items-center justify-center gap-5">
            <button
              onClick={() => setBpm(b => Math.max(40, b - 1))}
              className="w-11 h-11 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="text-center min-w-[80px]">
              <p className="text-5xl font-bold text-white tabular-nums leading-none">{bpm}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1.5">BPM</p>
            </div>
            <button
              onClick={() => setBpm(b => Math.min(220, b + 1))}
              className="w-11 h-11 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Slider */}
          <input
            type="range" min={40} max={220} value={bpm}
            onChange={e => setBpm(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-violet-500 cursor-pointer"
          />

          {/* Beat dots */}
          <div className="flex justify-center gap-4 py-1">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={cn(
                  'rounded-full transition-all duration-75',
                  activeBeat === i
                    ? i === 0
                      ? 'w-4 h-4 bg-accent-400 shadow-[0_0_10px_2px_rgba(139,92,246,0.6)]'
                      : 'w-3.5 h-3.5 bg-white/70'
                    : i === 0
                      ? 'w-3.5 h-3.5 bg-accent-500/30 border border-accent-500/40'
                      : 'w-3 h-3 bg-white/15'
                )}
              />
            ))}
          </div>

          {/* Play / Stop */}
          <button
            onClick={isPlaying ? stopScheduler : startScheduler}
            className={cn(
              'w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-3 transition-all duration-200',
              isPlaying
                ? 'bg-red-500/15 border border-red-500/35 text-red-400 hover:bg-red-500/25'
                : 'bg-gradient-to-b from-accent-500 to-accent-700 text-white shadow-[0_0_24px_-4px_rgba(124,92,252,0.55)] hover:from-accent-400 hover:to-accent-600'
            )}
          >
            {isPlaying
              ? <><Square className="w-5 h-5 fill-current" /> Stop</>
              : <><Play  className="w-5 h-5 fill-current" /> Play · {selectedKey} {isMinor ? 'min' : 'maj'} · {bpm} BPM</>
            }
          </button>
        </div>

      </div>
    </div>
  )
}
