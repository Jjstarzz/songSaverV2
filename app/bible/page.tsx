'use client'

import { useState } from 'react'
import { Search, BookOpen, Send, Copy, Check } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import { useSupabase } from '@/hooks/useSupabase'
import { cn } from '@/lib/utils'

interface Verse {
  reference: string
  text: string
}

export default function BiblePage() {
  const supabase = useSupabase()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Verse[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [selected, setSelected] = useState<Verse | null>(null)

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    setError('')
    setSelected(null)
    try {
      const res = await fetch(`/api/bible?op=search&q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Search failed'); }
      else if (data.verses?.length === 0) setError('No results found — try a reference like "John 3:16" or a keyword like "peace"')
      else setResults(data.verses)
    } catch {
      setError('Could not reach Bible API. Check your API key in Settings.')
    }
    setSearching(false)
  }

  const copyVerse = async (verse: Verse) => {
    await navigator.clipboard.writeText(`${verse.text} — ${verse.reference}`)
    setCopied(verse.reference)
    setTimeout(() => setCopied(null), 2000)
    toast.success('Copied to clipboard')
  }

  const presentVerse = async (verse: Verse) => {
    const sessionCode = sessionStorage.getItem('songsaver-present-code')
    if (!sessionCode) {
      toast.info('Open the presentation controller first to send to a screen')
      return
    }
    const ch = supabase.channel(`present-${sessionCode}`, { config: { broadcast: { ack: false } } })
    await ch.subscribe()
    ch.send({
      type: 'broadcast', event: 'slide',
      payload: { blank: false, section: verse.reference, lines: verse.text, title: '', background: 'dark', fontSizeKey: 'md', fontFamily: 'sans', textColor: '#ffffff' },
    })
    setTimeout(() => supabase.removeChannel(ch), 1000)
    toast.success(`Sent "${verse.reference}" to screen`)
  }

  return (
    <div className="pb-24">
      <PageHeader title="Scripture" subtitle="Search and present Bible verses" />

      <div className="px-4 space-y-4">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder='Reference (John 3:16) or keyword (peace)'
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.07] border border-white/10 text-white text-sm placeholder:text-white/30 outline-none focus:border-accent-500/50"
            />
          </div>
          <Button onClick={search} loading={searching} size="md" className="shrink-0">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="glass-card p-4 border border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Selected verse expanded view */}
        {selected && (
          <div className="glass-card p-5 space-y-3 border border-accent-500/25 animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold tracking-widest uppercase text-accent-400">{selected.reference}</p>
              <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white/60 text-xs shrink-0">✕</button>
            </div>
            <p className="text-white/90 text-base font-light leading-relaxed">{selected.text}</p>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={() => copyVerse(selected)} className="flex-1">
                {copied === selected.reference ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === selected.reference ? 'Copied' : 'Copy'}
              </Button>
              <Button size="sm" onClick={() => presentVerse(selected)} className="flex-1">
                <Send className="w-3.5 h-3.5" />
                Send to Screen
              </Button>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <p className="section-label">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            {results.map((verse, i) => (
              <button
                key={i}
                onClick={() => setSelected(verse)}
                className={cn(
                  'w-full text-left glass-card p-4 space-y-1.5 transition-all hover:bg-white/[0.07]',
                  selected?.reference === verse.reference && 'border border-accent-500/30'
                )}
              >
                <p className="text-xs font-bold tracking-widest uppercase text-accent-400">{verse.reference}</p>
                <p className="text-white/70 text-sm font-light leading-relaxed line-clamp-3">{verse.text}</p>
                <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => copyVerse(verse)}
                    className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    {copied === verse.reference ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied === verse.reference ? 'Copied' : 'Copy'}
                  </button>
                  <span className="text-white/10">·</span>
                  <button
                    onClick={() => presentVerse(verse)}
                    className="flex items-center gap-1 text-[11px] text-accent-400 hover:text-accent-300 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Send to Screen
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!searching && results.length === 0 && !error && (
          <div className="glass-card p-8 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-white/20 mx-auto" />
            <p className="text-sm text-white/40">Search for a verse by reference or keyword</p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {['John 3:16', 'Psalm 23', 'peace', 'faith'].map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); }}
                  className="px-3 py-1.5 rounded-full text-xs border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
