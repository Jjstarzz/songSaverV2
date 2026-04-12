'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Loader2, Music2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: number
  title: string
  artist: string
  thumbnail: string | null
}

interface LyricsSearchProps {
  initialQuery?: string
  onFound: (lyrics: string, title: string, artist: string) => void
  onClose: () => void
}

export function LyricsSearch({ initialQuery = '', onFound, onClose }: LyricsSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [fetchingId, setFetchingId] = useState<number | null>(null)
  const [noResults, setNoResults] = useState(false)
  const [notFoundResult, setNotFoundResult] = useState<SearchResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    if (initialQuery.trim()) doSearch(initialQuery)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    setNoResults(false)
    setNotFoundResult(null)
    try {
      const res = await fetch(`/api/lyrics/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
      if ((data.results ?? []).length === 0) setNoResults(true)
    } catch {
      setResults([])
      setNoResults(true)
    }
    setSearching(false)
  }

  const handleQueryChange = (val: string) => {
    setQuery(val)
    setNotFoundResult(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 500)
  }

  const handleSelect = async (result: SearchResult) => {
    setFetchingId(result.id)
    setNotFoundResult(null)
    try {
      const res = await fetch(
        `/api/lyrics/fetch?artist=${encodeURIComponent(result.artist)}&title=${encodeURIComponent(result.title)}`
      )
      if (res.ok) {
        const data = await res.json()
        onFound(data.lyrics ?? '', result.title, result.artist)
        return
      }
    } catch { /* fall through */ }

    // lyrics.ovh didn't have it — show a Google link the user can tap directly
    setNotFoundResult(result)
    setFetchingId(null)
  }

  const googleUrl = notFoundResult
    ? `https://www.google.com/search?q=${encodeURIComponent(`${notFoundResult.title} ${notFoundResult.artist} lyrics`)}`
    : ''

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search song title or artist…"
          className={cn(
            'w-full pl-9 pr-9 py-2.5 rounded-xl text-sm',
            'bg-[var(--bg-input)] border border-[var(--border)]',
            'text-[var(--fg)] placeholder:text-[var(--fg-subtle)]',
            'focus:outline-none focus:ring-2 focus:ring-accent-500/50'
          )}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)] animate-spin" />
        )}
        {!searching && query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setNoResults(false); setNotFoundResult(null) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Lyrics not found for a specific result */}
      {notFoundResult && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-400">
            Lyrics not found for <span className="font-medium">{notFoundResult.title}</span>
          </p>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-accent-400 hover:text-accent-300 transition-colors shrink-0 ml-2"
          >
            Search Google <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r)}
              disabled={fetchingId !== null}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left',
                'bg-[var(--bg-input)] border border-[var(--border)]',
                'hover:bg-[var(--bg-card-hover)] transition-colors',
                'disabled:opacity-60'
              )}
            >
              {r.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-accent-500/15 flex items-center justify-center shrink-0">
                  <Music2 className="w-4 h-4 text-accent-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--fg)] truncate">{r.title}</p>
                <p className="text-xs text-[var(--fg-muted)] truncate">{r.artist}</p>
              </div>
              {fetchingId === r.id && (
                <Loader2 className="w-4 h-4 text-accent-400 animate-spin shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {noResults && (
        <p className="text-xs text-center text-[var(--fg-subtle)] py-3">
          No results found. Try a different search.
        </p>
      )}

      <button
        onClick={onClose}
        className="text-xs text-[var(--fg-subtle)] hover:text-[var(--fg-muted)] transition-colors"
      >
        ← Back to manual entry
      </button>
    </div>
  )
}
