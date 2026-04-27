'use client'

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, X, Heart, ArrowUpDown } from 'lucide-react'
import { SongWithLanguages, MUSICAL_KEYS, LANGUAGE_NAMES, formatKey } from '@/types/database'
import { SongCard } from './SongCard'
import { SongCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Music2 } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const ALL_TAGS = ['Praise', 'Worship', 'Fast', 'Slow', 'Thanksgiving', 'Easter', 'Christmas', 'Advent', 'Communion', 'Offering', 'Opening', 'Closing']
const TIME_SIGS = ['2/4', '3/4', '4/4', '6/8', '12/8']
const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Updated' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'artist', label: 'Artist A–Z' },
  { value: 'bpm_asc', label: 'BPM ↑' },
  { value: 'bpm_desc', label: 'BPM ↓' },
]

interface SongListProps {
  songs: SongWithLanguages[]
  loading: boolean
  userKeys?: Record<string, string>
}

export function SongList({ songs, loading, userKeys = {} }: SongListProps) {
  const { isFavorite } = useFavorites()
  const { user } = useAuth()

  const [query, setQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedKey, setSelectedKey] = useState('')
  const [selectedUserKey, setSelectedUserKey] = useState('')
  const [selectedMode, setSelectedMode] = useState<'' | 'major' | 'minor'>('')
  const [selectedLang, setSelectedLang] = useState('')
  const [selectedOriginalLang, setSelectedOriginalLang] = useState('')
  const [selectedTimeSig, setSelectedTimeSig] = useState('')
  const [bpmMin, setBpmMin] = useState('')
  const [bpmMax, setBpmMax] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [showFavs, setShowFavs] = useState(false)
  const [showMine, setShowMine] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterTab, setFilterTab] = useState<'tags' | 'key' | 'lang' | 'bpm'>('tags')

  // Collect all languages present in the song library
  const availableLanguages = useMemo(() => {
    const langSet = new Set<string>()
    songs.forEach((s) => s.song_lyrics?.forEach((l) => langSet.add(l.language)))
    return Array.from(langSet).sort()
  }, [songs])

  const availableOriginalLanguages = useMemo(() => {
    const langSet = new Set<string>()
    songs.forEach((s) => { if (s.original_language) langSet.add(s.original_language) })
    return Array.from(langSet).sort()
  }, [songs])

  const activeFilterCount = [
    selectedTags.length > 0,
    selectedKey !== '',
    selectedUserKey !== '',
    selectedMode !== '',
    selectedLang !== '',
    selectedOriginalLang !== '',
    selectedTimeSig !== '',
    bpmMin !== '' || bpmMax !== '',
    showFavs,
    showMine,
  ].filter(Boolean).length

  const filteredSongs = useMemo(() => {
    let result = songs.filter((song) => {
      if (query) {
        const q = query.toLowerCase()
        const matchesTitle = song.title.toLowerCase().includes(q)
        const matchesArtist = song.artist?.toLowerCase().includes(q) ?? false
        if (!matchesTitle && !matchesArtist) return false
      }

      if (selectedTags.length > 0 && !selectedTags.every((t) => song.tags.includes(t))) return false
      if (selectedKey && song.default_key !== selectedKey && song.preferred_key !== selectedKey) return false
      if (selectedUserKey && userKeys[song.id] !== selectedUserKey) return false
      if (selectedMode && song.mode !== selectedMode) return false
      if (selectedTimeSig && song.time_signature !== selectedTimeSig) return false

      if (selectedLang) {
        const langs = song.song_lyrics?.map((l) => l.language) ?? []
        if (!langs.includes(selectedLang)) return false
      }

      if (selectedOriginalLang && song.original_language !== selectedOriginalLang) return false

      if (bpmMin && song.bpm != null && song.bpm < Number(bpmMin)) return false
      if (bpmMax && song.bpm != null && song.bpm > Number(bpmMax)) return false

      if (showFavs && !isFavorite(song.id)) return false
      if (showMine && song.created_by !== user?.id) return false

      return true
    })

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'title':   return a.title.localeCompare(b.title)
        case 'artist':  return (a.artist ?? '').localeCompare(b.artist ?? '')
        case 'bpm_asc': return (a.bpm ?? 0) - (b.bpm ?? 0)
        case 'bpm_desc':return (b.bpm ?? 0) - (a.bpm ?? 0)
        default:        return 0 // 'recent' — already ordered by updated_at from DB
      }
    })

    return result
  }, [songs, query, selectedTags, selectedKey, selectedUserKey, selectedMode, selectedLang, selectedOriginalLang, selectedTimeSig, bpmMin, bpmMax, sortBy, showFavs, showMine, isFavorite, user?.id, userKeys])

  const clearFilters = () => {
    setQuery('')
    setSelectedTags([])
    setSelectedKey('')
    setSelectedLang('')
    setSelectedOriginalLang('')
    setSelectedTimeSig('')
    setBpmMin('')
    setBpmMax('')
    setShowFavs(false)
    setShowMine(false)
    setSelectedUserKey('')
    setSelectedMode('')
    setSortBy('recent')
  }

  const hasFilters = query || selectedTags.length > 0 || selectedKey || selectedUserKey || selectedMode || selectedLang || selectedOriginalLang || selectedTimeSig || bpmMin || bpmMax || showFavs || showMine

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])

  return (
    <div className="space-y-3">
      {/* Sticky search + controls */}
      <div className="sticky top-0 z-30 pt-2 pb-1 bg-[var(--bg)]/90 backdrop-blur-xl px-4 -mx-4">
        {/* Search row */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)] pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs..."
              className="input-base pl-10 pr-10"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Added by you toggle */}
          <button
            onClick={() => setShowMine(!showMine)}
            className={cn(
              'h-10 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-all duration-200 shrink-0',
              showMine
                ? 'bg-accent-600 border-accent-500 text-white'
                : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-subtle)]'
            )}
            aria-label="Show songs added by me"
          >
            Mine
          </button>

          {/* Favourites toggle */}
          <button
            onClick={() => setShowFavs(!showFavs)}
            className={cn(
              'w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-200',
              showFavs
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-subtle)]'
            )}
            aria-label="Show favourites"
          >
            <Heart className={cn('w-4 h-4', showFavs && 'fill-current')} />
          </button>

          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-200',
              showFilters || activeFilterCount > 0
                ? 'bg-accent-600 border-accent-500 text-white'
                : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-subtle)]'
            )}
            aria-label="Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-500 text-[9px] text-white flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Expanded filters panel */}
        {showFilters && (
          <div className="mt-2 space-y-2">
            {/* Sort + filter tabs */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--fg-subtle)] pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full input-base py-2 pl-8 text-xs appearance-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-1">
                {(['tags', 'key', 'lang', 'bpm'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      filterTab === tab
                        ? 'bg-accent-600 border-accent-500 text-white'
                        : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)]'
                    )}
                  >
                    {tab === 'tags' ? 'Tags' : tab === 'key' ? 'Key' : tab === 'lang' ? 'Lang' : 'BPM'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags filter */}
            {filterTab === 'tags' && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {ALL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      selectedTags.includes(tag)
                        ? 'bg-accent-600 border-accent-500 text-white'
                        : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]'
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {/* Key filter */}
            {filterTab === 'key' && (
              <div className="space-y-2">
                <p className="text-[10px] text-[var(--fg-subtle)] font-medium uppercase tracking-wider">Song Key</p>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {MUSICAL_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedKey(selectedKey === key ? '' : key)}
                      className={cn(
                        'shrink-0 w-9 py-1.5 rounded-lg text-xs font-medium border transition-all text-center',
                        selectedKey === key
                          ? 'bg-accent-600 border-accent-500 text-white'
                          : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]'
                      )}
                    >
                      {key}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--fg-subtle)] font-medium uppercase tracking-wider pt-1">My Key</p>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {MUSICAL_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedUserKey(selectedUserKey === key ? '' : key)}
                      className={cn(
                        'shrink-0 w-9 py-1.5 rounded-lg text-xs font-medium border transition-all text-center',
                        selectedUserKey === key
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]'
                      )}
                    >
                      {key}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--fg-subtle)] font-medium uppercase tracking-wider pt-1">Mode</p>
                <div className="flex gap-2">
                  {([['', 'All'], ['major', 'Major'], ['minor', 'Minor']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setSelectedMode(selectedMode === val ? '' : val)}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        selectedMode === val && val !== ''
                          ? val === 'minor'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-accent-600 border-accent-500 text-white'
                          : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Language filter */}
            {filterTab === 'lang' && (
              <div className="space-y-2">
                {availableOriginalLanguages.length > 0 && (
                  <>
                    <p className="text-[10px] text-[var(--fg-subtle)] font-medium uppercase tracking-wider">Original Language</p>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {availableOriginalLanguages.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setSelectedOriginalLang(selectedOriginalLang === lang ? '' : lang)}
                          className={cn(
                            'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                            selectedOriginalLang === lang
                              ? 'bg-sky-600 border-sky-500 text-white'
                              : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]'
                          )}
                        >
                          {LANGUAGE_NAMES[lang] ?? lang}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p className="text-[10px] text-[var(--fg-subtle)] font-medium uppercase tracking-wider pt-1">Has Lyrics In</p>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {availableLanguages.length === 0 ? (
                    <p className="text-xs text-[var(--fg-subtle)] py-1">No lyrics added yet</p>
                  ) : (
                    availableLanguages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLang(selectedLang === lang ? '' : lang)}
                        className={cn(
                          'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                          selectedLang === lang
                            ? 'bg-accent-600 border-accent-500 text-white'
                            : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]'
                        )}
                      >
                        {LANGUAGE_NAMES[lang] ?? lang}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* BPM + time signature filter */}
            {filterTab === 'bpm' && (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={bpmMin}
                    onChange={(e) => setBpmMin(e.target.value)}
                    placeholder="Min BPM"
                    className="input-base py-2 text-xs"
                    min={40}
                    max={250}
                  />
                  <span className="text-[var(--fg-subtle)] text-sm">–</span>
                  <input
                    type="number"
                    value={bpmMax}
                    onChange={(e) => setBpmMax(e.target.value)}
                    placeholder="Max BPM"
                    className="input-base py-2 text-xs"
                    min={40}
                    max={250}
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {TIME_SIGS.map((ts) => (
                    <button
                      key={ts}
                      onClick={() => setSelectedTimeSig(selectedTimeSig === ts ? '' : ts)}
                      className={cn(
                        'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        selectedTimeSig === ts
                          ? 'bg-accent-600 border-accent-500 text-white'
                          : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)]'
                      )}
                    >
                      {ts}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results count + clear */}
        {hasFilters && (
          <div className="flex items-center justify-between mt-1.5 pb-1">
            <span className="text-xs text-[var(--fg-subtle)]">
              {filteredSongs.length} of {songs.length} songs
            </span>
            <button onClick={clearFilters} className="text-xs text-accent-400 hover:text-accent-300">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SongCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredSongs.length === 0 ? (
        <EmptyState
          icon={<Music2 className="w-7 h-7" />}
          title={hasFilters ? 'No songs match' : 'No songs yet'}
          description={
            hasFilters
              ? 'Try adjusting your search or filters'
              : 'Add your first song to start building your worship library'
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filteredSongs.map((song) => (
            <SongCard key={song.id} song={song} userKey={userKeys[song.id]} />
          ))}
        </div>
      )}
    </div>
  )
}
