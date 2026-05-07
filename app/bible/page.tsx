'use client'

import { useState } from 'react'
import { Search, BookOpen, Send, Copy, Check, ChevronLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import { useSupabase } from '@/hooks/useSupabase'
import { BIBLE_BOOKS, OT_BOOKS, NT_BOOKS } from '@/lib/bibleData'
import { cn } from '@/lib/utils'

interface Verse {
  reference: string
  text: string
}

type Tab = 'search' | 'browse'
type BrowseStep = 'book' | 'chapter' | 'verse'

export default function BiblePage() {
  const supabase = useSupabase()

  // Shared
  const [tab, setTab] = useState<Tab>('search')
  const [copied, setCopied] = useState<string | null>(null)
  const [selected, setSelected] = useState<Verse | null>(null)

  // Search tab
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Verse[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Browse tab
  const [browseStep, setBrowseStep] = useState<BrowseStep>('book')
  const [browseBook, setBrowseBook] = useState<(typeof BIBLE_BOOKS)[0] | null>(null)
  const [browseChapter, setBrowseChapter] = useState<number | null>(null)
  const [browseVerses, setBrowseVerses] = useState<{ id: string; reference: string }[]>([])
  const [loadingVerses, setLoadingVerses] = useState(false)
  const [browsePassage, setBrowsePassage] = useState<Verse | null>(null)
  const [loadingPassage, setLoadingPassage] = useState(false)

  // Search
  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    setSearchError('')
    setSelected(null)
    try {
      const res = await fetch(`/api/bible?op=search&q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (!res.ok) setSearchError(data.error ?? 'Search failed')
      else if (!data.verses?.length) setSearchError('No results — try a reference like "John 3:16" or a keyword like "peace"')
      else setResults(data.verses)
    } catch {
      setSearchError('Could not reach Bible API. Check your API key in Settings.')
    }
    setSearching(false)
  }

  // Browse: pick book
  const pickBook = (book: (typeof BIBLE_BOOKS)[0]) => {
    setBrowseBook(book)
    setBrowseChapter(null)
    setBrowseVerses([])
    setBrowsePassage(null)
    setSelected(null)
    setBrowseStep('chapter')
  }

  // Browse: pick chapter → fetch verse list
  const pickChapter = async (ch: number) => {
    if (!browseBook) return
    setBrowseChapter(ch)
    setBrowsePassage(null)
    setSelected(null)
    setBrowseStep('verse')
    setLoadingVerses(true)
    setBrowseVerses([])
    try {
      const chapterId = `${browseBook.id}.${ch}`
      const res = await fetch(`/api/bible?op=verses&chapter=${encodeURIComponent(chapterId)}`)
      const data = await res.json()
      setBrowseVerses(data.verses ?? [])
    } catch {
      toast.error('Failed to load verses')
    }
    setLoadingVerses(false)
  }

  // Browse: pick verse → fetch passage text
  const pickVerse = async (verseId: string) => {
    setLoadingPassage(true)
    setBrowsePassage(null)
    setSelected(null)
    try {
      const res = await fetch(`/api/bible?op=passage&id=${encodeURIComponent(verseId)}`)
      const data = await res.json()
      if (data.text && data.reference) {
        const verse: Verse = { reference: data.reference, text: data.text }
        setBrowsePassage(verse)
        setSelected(verse)
      }
    } catch {
      toast.error('Failed to load verse')
    }
    setLoadingPassage(false)
  }

  const browseBack = () => {
    if (browseStep === 'verse') { setBrowseStep('chapter'); setBrowsePassage(null); setSelected(null) }
    else if (browseStep === 'chapter') { setBrowseStep('book'); setBrowseBook(null) }
  }

  // Shared actions
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

  const hasSelected = selected !== null

  return (
    <div className="pb-24">
      <PageHeader
        title="Scripture"
        subtitle="Search and browse Bible verses"
        action={
          hasSelected ? (
            <Button size="sm" onClick={() => presentVerse(selected!)} className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Present
            </Button>
          ) : undefined
        }
      />

      <div className="px-4 space-y-4">
        {/* Tab switcher */}
        <div className="flex rounded-xl bg-white/[0.06] p-1 gap-1">
          {(['search', 'browse'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelected(null) }}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize',
                tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
              )}
            >
              {t === 'search' ? 'Search' : 'Browse'}
            </button>
          ))}
        </div>

        {/* ── SEARCH TAB ── */}
        {tab === 'search' && (
          <>
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

            {searchError && (
              <div className="glass-card p-4 border border-red-500/20">
                <p className="text-sm text-red-400">{searchError}</p>
              </div>
            )}

            {selected && tab === 'search' && <VerseCard verse={selected} onClose={() => setSelected(null)} onCopy={copyVerse} onPresent={presentVerse} copied={copied} />}

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
                      <button onClick={() => copyVerse(verse)} className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                        {copied === verse.reference ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copied === verse.reference ? 'Copied' : 'Copy'}
                      </button>
                      <span className="text-white/10">·</span>
                      <button onClick={() => presentVerse(verse)} className="flex items-center gap-1 text-[11px] text-accent-400 hover:text-accent-300 transition-colors">
                        <Send className="w-3 h-3" />
                        Send to Screen
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!searching && results.length === 0 && !searchError && (
              <div className="glass-card p-8 text-center space-y-3">
                <BookOpen className="w-8 h-8 text-white/20 mx-auto" />
                <p className="text-sm text-white/40">Search for a verse by reference or keyword</p>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {['John 3:16', 'Psalm 23', 'peace', 'faith'].map(s => (
                    <button key={s} onClick={() => setQuery(s)} className="px-3 py-1.5 rounded-full text-xs border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── BROWSE TAB ── */}
        {tab === 'browse' && (
          <>
            {/* Breadcrumb / back */}
            {browseStep !== 'book' && (
              <div className="flex items-center gap-2">
                <button onClick={browseBack} className="flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <span className="text-white/20">·</span>
                <span className="text-sm text-white/70">
                  {browseBook?.name}{browseChapter != null && browseStep === 'verse' ? ` · Chapter ${browseChapter}` : ''}
                </span>
              </div>
            )}

            {/* Book picker */}
            {browseStep === 'book' && (
              <div className="space-y-4">
                {[{ label: 'Old Testament', books: OT_BOOKS }, { label: 'New Testament', books: NT_BOOKS }].map(({ label, books }) => (
                  <div key={label} className="space-y-2">
                    <p className="section-label">{label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {books.map(book => (
                        <button
                          key={book.id}
                          onClick={() => pickBook(book)}
                          className="text-left glass-card px-3 py-2.5 rounded-xl hover:bg-white/[0.09] transition-colors"
                        >
                          <p className="text-sm text-white/85 font-medium">{book.name}</p>
                          <p className="text-[11px] text-white/35">{book.chapters} ch</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Chapter picker */}
            {browseStep === 'chapter' && browseBook && (
              <div className="space-y-2">
                <p className="section-label">Chapter</p>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: browseBook.chapters }, (_, i) => i + 1).map(ch => (
                    <button
                      key={ch}
                      onClick={() => pickChapter(ch)}
                      className={cn(
                        'aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all',
                        'bg-white/[0.07] hover:bg-white/[0.13] text-white/70 hover:text-white'
                      )}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Verse picker */}
            {browseStep === 'verse' && (
              <div className="space-y-3">
                {/* Verse list */}
                {loadingVerses && (
                  <div className="glass-card p-6 text-center">
                    <p className="text-sm text-white/40">Loading verses…</p>
                  </div>
                )}
                {!loadingVerses && browseVerses.length > 0 && (
                  <div className="space-y-2">
                    <p className="section-label">Verse</p>
                    <div className="grid grid-cols-5 gap-2">
                      {browseVerses.map(v => {
                        const num = v.reference.split(':')[1] ?? v.id.split('.').pop()
                        return (
                          <button
                            key={v.id}
                            onClick={() => pickVerse(v.id)}
                            className={cn(
                              'aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all',
                              selected?.reference === v.reference
                                ? 'bg-accent-500/30 text-accent-300 border border-accent-500/50'
                                : 'bg-white/[0.07] hover:bg-white/[0.13] text-white/70 hover:text-white'
                            )}
                          >
                            {num}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Passage display */}
                {loadingPassage && (
                  <div className="glass-card p-6 text-center">
                    <p className="text-sm text-white/40">Loading…</p>
                  </div>
                )}
                {browsePassage && !loadingPassage && (
                  <VerseCard verse={browsePassage} onCopy={copyVerse} onPresent={presentVerse} copied={copied} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function VerseCard({
  verse,
  onClose,
  onCopy,
  onPresent,
  copied,
}: {
  verse: Verse
  onClose?: () => void
  onCopy: (v: Verse) => void
  onPresent: (v: Verse) => void
  copied: string | null
}) {
  return (
    <div className="glass-card p-5 space-y-3 border border-accent-500/25 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold tracking-widest uppercase text-accent-400">{verse.reference}</p>
        {onClose && (
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xs shrink-0">✕</button>
        )}
      </div>
      <p className="text-white/90 text-base font-light leading-relaxed">{verse.text}</p>
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" size="sm" onClick={() => onCopy(verse)} className="flex-1">
          {copied === verse.reference ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied === verse.reference ? 'Copied' : 'Copy'}
        </Button>
        <Button size="sm" onClick={() => onPresent(verse)} className="flex-1">
          <Send className="w-3.5 h-3.5" />
          Send to Screen
        </Button>
      </div>
    </div>
  )
}
