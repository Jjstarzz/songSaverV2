'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Search, SlidersHorizontal, X, Heart, ArrowUpDown } from 'lucide-react'
import { SongWithLanguages, MUSICAL_KEYS, LANGUAGE_NAMES } from '@/types/database'
import { SongCard } from './SongCard'
import { SongCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Music2 } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'
import { useAuth } from '@/hooks/useAuth'
import { useSupabase } from '@/hooks/useSupabase'
import { cn } from '@/lib/utils'

const ALL_TAGS = ['Praise', 'Worship', 'Fast', 'Slow', 'Thanksgiving', 'Easter', 'Christmas', 'Advent', 'Communion', 'Offering', 'Opening', 'Closing']
const TIME_SIGS = ['2/4', '3/4', '4/4', '6/8', '12/8']
const SORT_OPTIONS = [
  { value: 'recent', label: 'Recent' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'artist', label: 'Artist A–Z' },
  { value: 'bpm_asc', label: 'Slowest first' },
  { value: 'bpm_desc', label: 'Fastest first' },
]

const PAGE_SIZE = 40

/** Stable (module-level) so memoised SongCards don't re-render on every keystroke */
function markReturn() {
  try { sessionStorage.setItem(RETURN_FLAG, '1') } catch { /* ignore */ }
}

/** Lowercase, strip accents and punctuation so "Lord, I lift" matches "lord i lift". */
function normalise(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .normalize('NFC') // recompose so Indic vowel signs match stored lyrics
    .replace(/[^\p{L}\p{M}\p{N}\s\u200C\u200D]/gu, ' ') // keep vowel signs + zero-width joiners (Malayalam/Tamil)
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Song IDs whose lyrics contain the search phrase. Words may be separated by
 * line breaks or punctuation in the lyrics, so "you are holy" also matches
 * "You are holy,\nholy".
 */
function useLyricMatches(query: string): Set<string> {
  const supabase = useSupabase()
  const [ids, setIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const words = normalise(query).split(' ').filter(Boolean)
    if (words.join(' ').length < 3 || typeof navigator !== 'undefined' && !navigator.onLine) {
      setIds(new Set())
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      // Escape LIKE wildcards in user input, then allow anything between words
      const pattern = '%' + words.map((w) => w.replace(/[\\%_]/g, (c) => '\\' + c)).join('%') + '%'
      const { data } = await supabase.from('song_lyrics').select('song_id').ilike('lyrics', pattern).limit(200)
      if (!cancelled) setIds(new Set((data ?? []).map((r: { song_id: string }) => r.song_id)))
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, supabase])

  return ids
}


/* ─── Persisted list state ─────────────────────────────────────────── */

interface Filters {
  query: string
  tags: string[]
  key: string
  userKey: string
  mode: '' | 'major' | 'minor'
  originalLang: string
  lyricsLang: string
  timeSig: string
  bpmMin: string
  bpmMax: string
  favs: boolean
  mine: boolean
  sort: string
}

const EMPTY_FILTERS: Filters = {
  query: '', tags: [], key: '', userKey: '', mode: '', originalLang: '', lyricsLang: '',
  timeSig: '', bpmMin: '', bpmMax: '', favs: false, mine: false, sort: 'recent',
}

const STATE_KEY = 'songsaver-library-state'
/** Set when a song is opened from the list, so coming back restores the scroll position */
export const RETURN_FLAG = 'songsaver-library-return'

interface SavedState { filters: Filters; scrollY: number; visible: number }

function readState(): SavedState | null {
  try {
    const raw = sessionStorage.getItem(STATE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as SavedState
    return { ...s, filters: { ...EMPTY_FILTERS, ...s.filters } }
  } catch { return null }
}
function writeState(s: SavedState) {
  try { sessionStorage.setItem(STATE_KEY, JSON.stringify(s)) } catch { /* private mode */ }
}

/* ─── Small controls ───────────────────────────────────────────────── */

function ToggleChip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className={cn(
        'shrink-0 h-10 px-3.5 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition-colors',
        on
          ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-fg)]'
          : 'bg-[var(--bg-input)] border-[var(--border-strong)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
      )}
    >
      {children}
    </button>
  )
}

function OptionChip({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'shrink-0 min-h-[36px] px-3 rounded-lg border text-sm font-medium transition-colors',
        on
          ? 'bg-accent-600 border-accent-600 text-white'
          : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]',
        className
      )}
    >
      {children}
    </button>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="section-label mb-2">{title}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  )
}

/* ─── List ─────────────────────────────────────────────────────────── */

interface SongListProps {
  songs: SongWithLanguages[]
  loading: boolean
  userKeys?: Record<string, string>
}

export function SongList({ songs, loading, userKeys = {} }: SongListProps) {
  const { favorites } = useFavorites()
  const { user } = useAuth()

  const [f, setF] = useState<Filters>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const restoreRef = useRef<SavedState | null>(null)
  // State (not a ref) so nothing is saved until the restored filters are actually applied —
  // otherwise the empty defaults overwrite the saved state on mount.
  const [hydrated, setHydrated] = useState(false)

  // Restore filters (always, for this browsing session) and scroll (only when coming back from a song)
  useEffect(() => {
    const saved = readState()
    if (saved) {
      setF(saved.filters)
      let returning = false
      try { returning = sessionStorage.getItem(RETURN_FLAG) === '1' } catch { /* ignore */ }
      if (returning) {
        restoreRef.current = saved
        setVisibleCount(Math.max(PAGE_SIZE, saved.visible))
      }
    }
    setHydrated(true)
  }, [])

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((prev) => ({ ...prev, [k]: v }))

  // Filtering 400+ songs on every keystroke makes typing lag on phones;
  // let React keep the input responsive and filter at lower priority.
  const deferredQuery = useDeferredValue(f.query)
  const lyricMatches = useLyricMatches(deferredQuery)

  const originalLanguages = useMemo(
    () => [...new Set(songs.map((s) => s.original_language).filter(Boolean) as string[])].sort(),
    [songs]
  )
  const lyricsLanguages = useMemo(
    () => [...new Set(songs.flatMap((s) => s.song_lyrics?.map((l) => l.language) ?? []))].sort(),
    [songs]
  )

  // Normalise each song's title/artist once per library load — not on every keystroke
  const searchText = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of songs) m.set(s.id, normalise(s.title) + '\n' + (s.artist ? normalise(s.artist) : ''))
    return m
  }, [songs])

  const filtered = useMemo(() => {
    const q = deferredQuery ? normalise(deferredQuery) : ''
    const direct = new Set<string>()
    const matchesText = (s: SongWithLanguages) => {
      if (direct.has(s.id)) return true
      const t = searchText.get(s.id)
      // title and artist are separated by a newline so a query can't match across them
      const hit = !!t && t.split('\n').some((part) => part.includes(q))
      if (hit) direct.add(s.id)
      return hit
    }

    const result = songs.filter((song) => {
      if (q && !matchesText(song) && !lyricMatches.has(song.id)) return false
      if (f.tags.length > 0 && !f.tags.every((t) => song.tags.includes(t))) return false
      if (f.key && song.default_key !== f.key && song.preferred_key !== f.key) return false
      if (f.userKey && userKeys[song.id] !== f.userKey) return false
      if (f.mode && song.mode !== f.mode) return false
      if (f.timeSig && song.time_signature !== f.timeSig) return false
      if (f.originalLang && song.original_language !== f.originalLang) return false
      if (f.lyricsLang && !song.song_lyrics?.some((l) => l.language === f.lyricsLang)) return false
      if (f.bpmMin && (song.bpm == null || song.bpm < Number(f.bpmMin))) return false
      if (f.bpmMax && (song.bpm == null || song.bpm > Number(f.bpmMax))) return false
      if (f.favs && !favorites.has(song.id)) return false
      if (f.mine && song.created_by !== user?.id) return false
      return true
    })

    result.sort((a, b) => {
      switch (f.sort) {
        case 'title':    return a.title.localeCompare(b.title)
        case 'artist':   return (a.artist ?? '').localeCompare(b.artist ?? '')
        case 'bpm_asc':  return (a.bpm ?? 0) - (b.bpm ?? 0)
        case 'bpm_desc': return (b.bpm ?? 0) - (a.bpm ?? 0)
        default:         return 0 // 'recent' — already ordered by updated_at from the database
      }
    })

    // When searching, title/artist matches come before lyric-only matches
    if (!q) return { list: result, firstLyricOnly: -1 }
    const directHits = result.filter((s) => direct.has(s.id))
    const lyricOnly = result.filter((s) => !direct.has(s.id))
    return { list: [...directHits, ...lyricOnly], firstLyricOnly: lyricOnly.length ? directHits.length : -1 }
  }, [songs, searchText, deferredQuery, lyricMatches, f, favorites, user?.id, userKeys])
  const filteredSongs = filtered.list

  // Persist filters as they change
  useEffect(() => {
    if (!hydrated) return
    const prev = readState()
    writeState({ filters: f, scrollY: prev?.scrollY ?? 0, visible: prev?.visible ?? PAGE_SIZE })
  }, [f, hydrated])

  // Remember scroll position + how many songs were loaded
  useEffect(() => {
    let raf = 0
    const save = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (restoreRef.current || !document.querySelector('[data-song-list]')) return // not while restoring / unmounted
        const prev = readState()
        writeState({ filters: prev?.filters ?? f, scrollY: window.scrollY, visible: visibleCountRef.current })
      })
    }
    window.addEventListener('scroll', save, { passive: true })
    return () => { window.removeEventListener('scroll', save); cancelAnimationFrame(raf) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const visibleCountRef = useRef(visibleCount)
  visibleCountRef.current = visibleCount

  // Scroll back to where the user was once the list has rendered
  useEffect(() => {
    const r = restoreRef.current
    if (!r || loading || songs.length === 0) return
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.scrollTo(0, r.scrollY)
      restoreRef.current = null
      try { sessionStorage.removeItem(RETURN_FLAG) } catch { /* ignore */ }
    }))
  }, [loading, songs.length, filteredSongs])

  // Reset paging when the result set changes (but not during a restore)
  const firstFilterRun = useRef(true)
  useEffect(() => {
    if (firstFilterRun.current) { firstFilterRun.current = false; return }
    if (!restoreRef.current) setVisibleCount(PAGE_SIZE)
  }, [deferredQuery, f.tags, f.key, f.userKey, f.mode, f.timeSig, f.originalLang, f.lyricsLang, f.bpmMin, f.bpmMax, f.favs, f.mine, f.sort])

  // Load more as the user nears the end
  const sentinelRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCount((n) => n + PAGE_SIZE) },
      { rootMargin: '800px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [filteredSongs, visibleCount])

  const firstLyricOnlyIdx = filtered.firstLyricOnly

  // Active filters as removable chips (search box and the Mine/Favourites toggles are visible already)
  const chips: { label: string; clear: () => void }[] = [
    ...f.tags.map((t) => ({ label: t, clear: () => set('tags', f.tags.filter((x) => x !== t)) })),
    ...(f.key ? [{ label: `Key ${f.key}`, clear: () => set('key', '') }] : []),
    ...(f.userKey ? [{ label: `My key ${f.userKey}`, clear: () => set('userKey', '') }] : []),
    ...(f.mode ? [{ label: f.mode === 'major' ? 'Major' : 'Minor', clear: () => set('mode', '') }] : []),
    ...(f.originalLang ? [{ label: `Original: ${LANGUAGE_NAMES[f.originalLang] ?? f.originalLang}`, clear: () => set('originalLang', '') }] : []),
    ...(f.lyricsLang ? [{ label: `Lyrics in ${LANGUAGE_NAMES[f.lyricsLang] ?? f.lyricsLang}`, clear: () => set('lyricsLang', '') }] : []),
    ...(f.timeSig ? [{ label: f.timeSig, clear: () => set('timeSig', '') }] : []),
    ...(f.bpmMin || f.bpmMax ? [{ label: `${f.bpmMin || '…'}–${f.bpmMax || '…'} BPM`, clear: () => setF((p) => ({ ...p, bpmMin: '', bpmMax: '' })) }] : []),
  ]
  const panelFilterCount = chips.length
  const anyFilter = !!f.query || f.favs || f.mine || chips.length > 0
  const resetAll = () => setF((p) => ({ ...EMPTY_FILTERS, sort: p.sort }))
  const toggleTag = (tag: string) => set('tags', f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag])

  const sortSelect = (
    <label className="relative shrink-0 flex items-center">
      <span className="sr-only">Sort songs</span>
      <ArrowUpDown aria-hidden className="absolute left-3 w-4 h-4 text-[var(--fg-subtle)] pointer-events-none" />
      <select
        value={f.sort}
        onChange={(e) => set('sort', e.target.value)}
        className="h-10 pl-9 pr-3 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-input)] text-sm text-[var(--fg-muted)] appearance-none cursor-pointer"
      >
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )

  return (
    <div className="space-y-3">
      {/* Search + controls */}
      <div className="sticky-search-bg sticky top-0 z-30 -mx-4 px-4 pb-2 space-y-2" style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}>
        <div className="relative">
          <Search aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)] pointer-events-none" />
          <input
            type="search"
            value={f.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder="Search titles, artists or lyrics"
            aria-label="Search songs"
            className="input-base pl-10 pr-11 [&::-webkit-search-cancel-button]:hidden"
          />
          {f.query && (
            <button
              type="button"
              onClick={() => set('query', '')}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-[var(--fg-subtle)] hover:text-[var(--fg)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <ToggleChip on={f.mine} onClick={() => set('mine', !f.mine)}>Mine</ToggleChip>
          <ToggleChip on={f.favs} onClick={() => set('favs', !f.favs)}>
            <Heart aria-hidden className={cn('w-4 h-4', f.favs && 'fill-current')} />
            <span className="sr-only min-[420px]:not-sr-only">Favourites</span>
          </ToggleChip>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-controls="song-filters"
            className={cn(
              'shrink-0 h-10 px-3.5 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition-colors',
              showFilters || panelFilterCount > 0
                ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-fg)]'
                : 'bg-[var(--bg-input)] border-[var(--border-strong)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
            )}
          >
            <SlidersHorizontal aria-hidden className="w-4 h-4" />
            Filters
            {panelFilterCount > 0 && (
              <span className="min-w-[20px] h-5 px-1 rounded-full bg-accent-600 text-white text-xs font-semibold flex items-center justify-center">
                {panelFilterCount}
                <span className="sr-only"> active</span>
              </span>
            )}
          </button>
          <span className="flex-1" />
          {sortSelect}
        </div>

        {showFilters && (
          <div id="song-filters" className="surface p-4 space-y-4 animate-fade-in">
            {originalLanguages.length > 0 && (
              <FilterGroup title="Original language">
                {originalLanguages.map((lang) => (
                  <OptionChip key={lang} on={f.originalLang === lang} onClick={() => set('originalLang', f.originalLang === lang ? '' : lang)}>
                    {LANGUAGE_NAMES[lang] ?? lang}
                  </OptionChip>
                ))}
              </FilterGroup>
            )}
            {lyricsLanguages.length > 0 && (
              <FilterGroup title="Has lyrics in">
                {lyricsLanguages.map((lang) => (
                  <OptionChip key={lang} on={f.lyricsLang === lang} onClick={() => set('lyricsLang', f.lyricsLang === lang ? '' : lang)}>
                    {LANGUAGE_NAMES[lang] ?? lang}
                  </OptionChip>
                ))}
              </FilterGroup>
            )}
            <FilterGroup title="Tags">
              {ALL_TAGS.map((tag) => (
                <OptionChip key={tag} on={f.tags.includes(tag)} onClick={() => toggleTag(tag)}>{tag}</OptionChip>
              ))}
            </FilterGroup>
            <FilterGroup title="Song key">
              {MUSICAL_KEYS.map((k) => (
                <OptionChip key={k} className="w-11 px-0" on={f.key === k} onClick={() => set('key', f.key === k ? '' : k)}>{k}</OptionChip>
              ))}
            </FilterGroup>
            <FilterGroup title="My key">
              {MUSICAL_KEYS.map((k) => (
                <OptionChip key={k} className="w-11 px-0" on={f.userKey === k} onClick={() => set('userKey', f.userKey === k ? '' : k)}>{k}</OptionChip>
              ))}
            </FilterGroup>
            <div className="grid sm:grid-cols-2 gap-4">
              <FilterGroup title="Mode">
                {(['major', 'minor'] as const).map((m) => (
                  <OptionChip key={m} on={f.mode === m} onClick={() => set('mode', f.mode === m ? '' : m)}>{m === 'major' ? 'Major' : 'Minor'}</OptionChip>
                ))}
              </FilterGroup>
              <FilterGroup title="Time signature">
                {TIME_SIGS.map((ts) => (
                  <OptionChip key={ts} on={f.timeSig === ts} onClick={() => set('timeSig', f.timeSig === ts ? '' : ts)}>{ts}</OptionChip>
                ))}
              </FilterGroup>
            </div>
            <fieldset>
              <legend className="section-label mb-2">Tempo (BPM)</legend>
              <div className="flex gap-2 items-center max-w-xs">
                <input type="number" inputMode="numeric" value={f.bpmMin} onChange={(e) => set('bpmMin', e.target.value)} placeholder="From" aria-label="Minimum BPM" className="input-base" min={20} max={300} />
                <span aria-hidden className="text-[var(--fg-subtle)]">–</span>
                <input type="number" inputMode="numeric" value={f.bpmMax} onChange={(e) => set('bpmMax', e.target.value)} placeholder="To" aria-label="Maximum BPM" className="input-base" min={20} max={300} />
              </div>
            </fieldset>
          </div>
        )}

        {/* Result count, selected filters, reset */}
        <div className="flex items-center gap-2 flex-wrap min-h-[28px]" aria-live="polite">
          <span className="text-sm text-[var(--fg-muted)]">
            {loading ? 'Loading songs…' : anyFilter ? `${filteredSongs.length} of ${songs.length} songs` : `${songs.length} songs`}
          </span>
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.clear}
              aria-label={`Remove filter: ${c.label}`}
              className="h-7 pl-2.5 pr-1.5 rounded-full text-xs font-medium flex items-center gap-1 bg-[var(--accent-soft)] text-[var(--accent-fg)] border border-[var(--accent-border)]"
            >
              {c.label}
              <X aria-hidden className="w-3.5 h-3.5" />
            </button>
          ))}
          {anyFilter && (
            <button type="button" onClick={resetAll} className="h-7 px-2 text-xs font-medium text-[var(--accent-fg)] hover:underline">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Desktop column headings */}
      {!loading && filteredSongs.length > 0 && (
        <div aria-hidden className="hidden md:grid song-row-grid px-3 border border-transparent text-xs font-medium text-[var(--fg-subtle)]">
          <span>Key</span><span>Song</span><span>Time · BPM</span><span>Languages</span><span>Last sung</span><span />
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <SongCardSkeleton key={i} />)}
        </div>
      ) : filteredSongs.length === 0 ? (
        <EmptyState
          icon={<Music2 className="w-7 h-7" />}
          title={anyFilter ? 'No songs match' : 'No songs yet'}
          description={anyFilter ? 'Try a different search, or reset the filters.' : 'Add your first song to start building your worship library.'}
          action={anyFilter ? <button type="button" onClick={resetAll} className="h-10 px-4 rounded-xl border border-[var(--border-strong)] text-sm font-medium text-[var(--fg)]">Reset search &amp; filters</button> : undefined}
        />
      ) : (
        <ul className="space-y-1.5" data-song-list>
          {filteredSongs.slice(0, visibleCount).map((song, i) => (
            <li key={song.id}>
              {i === firstLyricOnlyIdx && <p className="section-label pt-3 pb-1.5">Found in lyrics</p>}
              <SongCard
                song={song}
                userKey={userKeys[song.id]}
                onOpen={markReturn}
              />
            </li>
          ))}
          {visibleCount < filteredSongs.length && <li ref={sentinelRef} className="h-10" aria-hidden />}
        </ul>
      )}
    </div>
  )
}
