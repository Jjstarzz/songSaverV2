'use client'

import { useState } from 'react'
import { Drum, Mic2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Metronome } from '@/components/rehearsal/Metronome'
import { AudioRecorder } from '@/components/rehearsal/AudioRecorder'
import { cn } from '@/lib/utils'

type Tab = 'metronome' | 'recorder'

export default function RehearsalPage() {
  const [tab, setTab] = useState<Tab>('metronome')

  return (
    <div className="px-4">
      <PageHeader title="Rehearsal" subtitle="Practice tools" />

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
        {([
          { key: 'metronome', label: 'Metronome', icon: Drum },
          { key: 'recorder', label: 'Recorder', icon: Mic2 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              tab === key
                ? 'bg-accent-600 text-white shadow-glow-sm'
                : 'text-white/50 hover:text-white/80'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {tab === 'metronome' ? (
          <div className="glass-card p-6">
            <Metronome />
          </div>
        ) : (
          <div className="glass-card p-6">
            <AudioRecorder />
          </div>
        )}
      </div>
    </div>
  )
}
