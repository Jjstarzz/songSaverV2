'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, BookOpen, Send, Copy, Check } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import { useSupabase } from '@/hooks/useSupabase'
import { BIBLE_BOOKS } from '@/lib/bibleData'
import { cn } from '@/lib/utils'

interface Verse {
  reference: string
  text: string
}

type Tab = 'search' | 'browse'

const RECENT_KEY = 'bible-recent'
const MAX_RECENT = 8

function loadRecent(): Verse[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
function saveRecent(verse: Verse) {
  const list = loadRecent().filter(v => v.reference !== verse.reference)
  localStorage.setItem(RECENT_KEY, JSON.stringify([verse, ...list].slice(0, MAX_RECENT)))
}

export default function BiblePage() {
  const supabase = useSupabase()

  const [tab, setTab] = useState<Tab>('search')
  const [copied, setCopied] = useState<string | null>(null)
  const [selected, setSelected] = useState<Verse | null>(null)

  // Search tab
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Verse[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Browse tab
  const [browseBook, setBrowseBook] = useState<(typeof BIBLE_BOOKS)[0] | null>(null)
  const [browseChapter, setBrowseChapter] = useState<number | null>(null)
  const [browseVerses, setBrowseVerses] = useState<{ id: string; reference: string }[]>([])
  const [loadingVerses, setLoadingVerses] = useState(false)
  const [browsePassage, setBrowsePassage] = useState<Verse | null>(null)
  const [loadingPassage, setLoadingPassage] = useState(false)
  const [recent, setRecent] = useState<Verse[]>([])

  // Column scroll refs
  const bookColRef = useRef<HTMLDivElement>(null)
  const chColRef = useRef<HTMLDivElement>(null)
  const vsColRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setRecent(loadRecent()) }, [])

  // Auto-scroll selected items into view within their column
  const scrollTo = (colRef: React.RefObject<HTMLDivElement | null>, id: string) => {
    const col = colRef.current
    const el = col?.querySelector<HTMLElement>(`[data-id="${id}"]`)
    if (!col || !el) return
    const elTop = el.offsetTop - col.offsetTop
    const center = elTop - col.clientHeight / 2 + el.clientHeight / 2
    col.scrollTo({ top: center, behavior: 'smooth' })
  }

  useEffect(() => { if (browseBook) scrollTo(bookColRef, browseBook.id) }, [browseBook])
  useEffect(() => { if (browseChapter) scrollTo(chColRef, String(browseChapter)) }, [browseChapter])
  useEffect(() => { if (selected) scrollTo(vsColRef, selected.reference) }, [selected])

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

  const fetchVerses = useCallback(async (bookId: string, ch: number) => {
    setLoadingVerses(true)
    setBrowseVerses([])
    try {
      const res = await fetch(`/api/bible?op=verses&chapter=${encodeURIComponent(`${bookId}.${ch}`)}`)
      const data = await res.json()
      setBrowseVerses(data.verses ?? [])
    } catch {
      toast.error('Failed to load verses')
    }
    setLoadingVerses(false)
  }, [])

  const pickBook = (book: (typeof BIBLE_BOOKS)[0]) => {
    if (browseBook?.id === book.id) return
    setBrowseBook(book)
    setBrowseChapter(1)
    setBrowsePassage(null)
    setSelected(null)
    fetchVerses(book.id, 1)
  }

  const pickChapter = (ch: number) => {
    if (!browseBook || browseChapter === ch) return
    setBrowseChapter(ch)
    setBrowsePassage(null)
    setSelected(null)
    fetchVerses(browseBook.id, ch)
  }

  const pickVerse = async (verseId: string, verseRef: string) => {
    if (selected?.reference === verseRef) return
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
        saveRecent(verse)
        setRecent(loadRecent())
      }
    } catch {
      toast.error('Failed to load verse')
    }
    setLoadingPassage(false)
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
      <PageHeader
        title="Scripture"
        subtitle="Search and browse Bible verses"
        action={
          selected ? (
            <Button size="sm" onClick={() => presentVerse(selected)} className="gap-1.5">
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

            {selected && tab === 'search' && (
              <VerseCard verse={selected} onClose={() => { setSelected(null) }} onCopy={copyVerse} onPresent={presentVerse} copied={copied} />
            )}

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
          <div className="space-y-4">
            {/* Three-column picker */}
            <div className="rounded-2xl overflow-hidden border border-white/[0.07] bg-white/[0.03]" style={{ height: 240 }}>
              <div className="flex h-full divide-x divide-white/[0.07]">

                {/* Book column */}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="px-3 py-2 border-b border-white/[0.07] bg-white/[0.04] shrink-0">
                    <p className="text-[10px] font-bold tracking-widest text-white/35 uppercase">Book</p>
                  </div>
                  <div ref={bookColRef} className="overflow-y-auto flex-1">
                    {BIBLE_BOOKS.map(book => (
                      <button
                        key={book.id}
                        data-id={book.id}
                        onClick={() => pickBook(book)}
                        className={cn(
                          'w-full text-left px-3 py-[7px] text-sm transition-colors',
                          browseBook?.id === book.id
                            ? 'bg-accent-500/20 text-accent-300 font-semibold'
                            : 'text-white/55 hover:text-white/85 hover:bg-white/[0.05]'
                        )}
                      >
                        {book.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chapter column */}
                <div className="flex flex-col w-14 shrink-0">
                  <div className="px-1 py-2 border-b border-white/[0.07] bg-white/[0.04] shrink-0 text-center">
                    <p className="text-[10px] font-bold tracking-widest text-white/35 uppercase">Ch</p>
                  </div>
                  <div ref={chColRef} className="overflow-y-auto flex-1">
                    {browseBook
                      ? Array.from({ length: browseBook.chapters }, (_, i) => i + 1).map(ch => (
                          <button
                            key={ch}
                            data-id={String(ch)}
                            onClick={() => pickChapter(ch)}
                            className={cn(
                              'w-full text-center py-[7px] text-sm transition-colors',
                              browseChapter === ch
                                ? 'bg-accent-500/20 text-accent-300 font-semibold'
                                : 'text-white/55 hover:text-white/85 hover:bg-white/[0.05]'
                            )}
                          >
                            {ch}
                          </button>
                        ))
                      : <p className="text-center text-white/20 text-xs py-4">—</p>
                    }
                  </div>
                </div>

                {/* Verse column */}
                <div className="flex flex-col w-14 shrink-0">
                  <div className="px-1 py-2 border-b border-white/[0.07] bg-white/[0.04] shrink-0 text-center">
                    <p className="text-[10px] font-bold tracking-widest text-white/35 uppercase">Vs</p>
                  </div>
                  <div ref={vsColRef} className="overflow-y-auto flex-1">
                    {loadingVerses
                      ? <p className="text-center text-white/20 text-xs py-4">…</p>
                      : browseVerses.length > 0
                        ? browseVerses.map(v => {
                            const num = v.reference.split(':')[1] ?? v.id.split('.').pop()
                            return (
                              <button
                                key={v.id}
                                data-id={v.reference}
                                onClick={() => pickVerse(v.id, v.reference)}
                                className={cn(
                                  'w-full text-center py-[7px] text-sm transition-colors',
                                  selected?.reference === v.reference
                                    ? 'bg-accent-500/20 text-accent-300 font-semibold'
                                    : 'text-white/55 hover:text-white/85 hover:bg-white/[0.05]'
                                )}
                              >
                                {num}
                              </button>
                            )
                          })
                        : <p className="text-center text-white/20 text-xs py-4">—</p>
                    }
                  </div>
                </div>

              </div>
            </div>

            {/* Passage display */}
            {loadingPassage && (
              <div className="glass-card p-6 text-center">
                <p className="text-sm text-white/40">Loading…</p>
              </div>
            )}
            {browsePassage && !loadingPassage && (
              <VerseCard verse={browsePassage} onCopy={copyVerse} onPresent={presentVerse} copied={copied} />
            )}

            {/* Recent */}
            {recent.length > 0 && (
              <div className="space-y-2">
                <p className="section-label">Recent</p>
                <div className="flex flex-wrap gap-2">
                  {recent.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => { setBrowsePassage(v); setSelected(v) }}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs border transition-colors',
                        selected?.reference === v.reference
                          ? 'border-accent-500/50 text-accent-300 bg-accent-500/10'
                          : 'border-white/10 text-white/45 hover:text-white/70 hover:border-white/20'
                      )}
                    >
                      {v.reference}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
