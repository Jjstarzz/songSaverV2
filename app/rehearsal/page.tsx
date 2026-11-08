'use client'

import { PageHeader } from '@/components/layout/PageHeader'
import { Metronome } from '@/components/rehearsal/Metronome'

export default function RehearsalPage() {
  return (
    <div className="px-4 max-w-2xl">
      <PageHeader className="px-0" title="Metronome" subtitle="Keep time while you practise" />
      <div className="glass-card p-6">
        <Metronome />
      </div>
    </div>
  )
}
