'use client'

import { useState } from 'react'
import { Sliders, Sparkles } from 'lucide-react'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MUSICAL_KEYS } from '@/types/database'
import { suggestKey } from '@/lib/utils'

interface KeySuggesterProps {
  songKey?: string | null
}

const OCTAVES = ['2', '3', '4', '5', '6']
const noteOptions = (prefix: string) =>
  MUSICAL_KEYS.map((n) => ({ value: `${n}${prefix}`, label: `${n}${prefix}` }))

export function KeySuggester({ songKey }: KeySuggesterProps) {
  const [open, setOpen] = useState(false)
  const [vocalLow, setVocalLow] = useState('C3')
  const [vocalHigh, setVocalHigh] = useState('G4')
  const [suggestedKey, setSuggestedKey] = useState<string | null>(null)

  const handleSuggest = () => {
    if (!songKey) return
    const key = suggestKey(vocalLow, vocalHigh, songKey)
    setSuggestedKey(key)
  }

  const lowOptions = OCTAVES.flatMap((o) => MUSICAL_KEYS.map((n) => ({ value: `${n}${o}`, label: `${n}${o}` })))
  const highOptions = [...lowOptions]

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-accent-400 hover:text-accent-300 transition-colors"
      >
        <Sliders className="w-4 h-4" />
        Key Suggester
      </button>

      {open && (
        <div className="glass-card p-4 space-y-4 animate-fade-in">
          <p className="text-sm text-white/60">
            Enter your vocal range to get a key recommendation
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Lowest note"
              value={vocalLow}
              onChange={(e) => setVocalLow(e.target.value)}
              options={lowOptions}
            />
            <Select
              label="Highest note"
              value={vocalHigh}
              onChange={(e) => setVocalHigh(e.target.value)}
              options={highOptions}
            />
          </div>

          {!songKey && (
            <p className="text-xs text-amber-400/80">Set a default key on the song to use this feature</p>
          )}

          <Button
            onClick={handleSuggest}
            disabled={!songKey}
            variant="outline"
            className="w-full"
          >
            <Sparkles className="w-4 h-4" />
            Suggest Key
          </Button>

          {suggestedKey && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-500/10 border border-accent-500/20">
              <Sparkles className="w-4 h-4 text-accent-400" />
              <div>
                <p className="text-xs text-white/50">Recommended key</p>
                <p className="text-lg font-bold text-accent-400">{suggestedKey}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
