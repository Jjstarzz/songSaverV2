'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { SongWithLanguages, LANGUAGE_NAMES, formatKey } from '@/types/database'
import { useFavorites } from '@/hooks/useFavorites'
import { cn } from '@/lib/utils'

interface SongCardProps {
  song: SongWithLanguages
  compact?: boolean
  userKey?: string
  /** Called when the song is opened (used to restore the list's scroll position) */
  onOpen?: () => void
}

const langName = (code: string) => LANGUAGE_NAMES[code] ?? code.toUpperCase()

/**
 * One song in a list. Phones: title (2 lines max), artist, then musical details.
 * md+: aligned columns — Key | Song | Time·BPM | Languages | Last sung | ♥.
 * The favourite button sits outside the link so it isn't a nested control.
 */
export const SongCard = memo(function SongCard({ song, compact, userKey, onOpen }: SongCardProps) {
  const { isFavorite, toggle } = useFavorites()
  const fav = isFavorite(song.id)

  // Original language first, then other lyrics languages; no duplicates
  const languages = [...new Set([
    ...(song.original_language ? [song.original_language] : []),
    ...(song.song_lyrics?.map((l) => l.language) ?? []),
  ])]
  const hasLyrics = (song.song_lyrics?.length ?? 0) > 0
  const key = userKey || song.preferred_key || song.default_key
  const keyShort = key ? `${key}${song.mode === 'minor' ? 'm' : ''}` : null
  const lastSung = song.last_sung_date
    ? new Date(song.last_sung_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null
  const tempo = [song.time_signature, song.bpm ? `${song.bpm} BPM` : null].filter(Boolean).join(' · ')
  // Only show real words as tags (one song has a stray "-1" tag that looked like a counter)
  const tags = song.tags.filter((t) => /\p{L}/u.test(t))
  const hiddenTags = tags.length - 2

  const keyTile = (
    <span
      className={cn(
        'shrink-0 rounded-lg flex items-center justify-center font-semibold tabular text-sm',
        compact ? 'w-9 h-9' : 'w-11 h-11',
        userKey
          ? 'bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]'
          : keyShort
            ? 'bg-[var(--accent-soft)] text-[var(--accent-fg)]'
            : 'border border-dashed border-[var(--border-strong)] text-[var(--fg-subtle)] text-xs font-normal'
      )}
      title={key ? `${formatKey(key, song.mode)}${userKey ? ' (your key)' : ''}` : 'No key set'}
    >
      {keyShort ?? '–'}
      <span className="sr-only">{key ? `Key ${formatKey(key, song.mode)}${userKey ? ', your key' : ''}` : 'No key set'}</span>
    </span>
  )

  return (
    <div className="relative group">
      <Link
        href={`/songs/${song.id}`}
        onClick={onOpen}
        className={cn(
          'glass-card-hover flex items-center gap-3 md:song-row-grid',
          compact ? 'p-2.5 pr-3' : 'p-3 pr-14 md:pr-3'
        )}
      >
        {keyTile}

        {/* Song: title, artist, then (on phones) musical details */}
        <span className="min-w-0 flex-1 md:flex-none">
          <span className="block text-[15px] font-semibold leading-snug text-[var(--fg)] line-clamp-2 break-words">
            {song.title}
          </span>
          {song.artist && <span className="block text-sm text-[var(--fg-muted)] truncate mt-0.5">{song.artist}</span>}
          {!compact && (
            <span className="md:hidden flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-[var(--fg-subtle)]">
              {tempo && <span>{tempo}</span>}
              {languages.length > 0 && <span>{languages.map(langName).join(' · ')}</span>}
              {lastSung && <span>Sung {lastSung}</span>}
              {!hasLyrics && <span className="text-[var(--warning)]">No lyrics</span>}
            </span>
          )}
          {!compact && tags.length > 0 && (
            <span className="flex flex-wrap gap-1 mt-1.5">
              {tags.slice(0, 2).map((tag) => <span key={tag} className="tag-pill">{tag}</span>)}
              {hiddenTags > 0 && <span className="text-[11px] text-[var(--fg-subtle)] self-center">+{hiddenTags}</span>}
            </span>
          )}
        </span>

        {/* Desktop columns */}
        {!compact && (
          <>
            <span className="hidden md:block text-sm text-[var(--fg-muted)] tabular">{tempo || <span className="text-[var(--fg-subtle)]">—</span>}</span>
            <span className="hidden md:block text-sm text-[var(--fg-muted)] truncate">
              {languages.length > 0
                ? languages.map(langName).join(', ')
                : <span className="text-[var(--fg-subtle)]">—</span>}
              {!hasLyrics && <span className="block text-xs text-[var(--warning)]">No lyrics</span>}
            </span>
            <span className="hidden md:block text-sm text-[var(--fg-muted)] tabular">{lastSung ?? <span className="text-[var(--fg-subtle)]">—</span>}</span>
          </>
        )}
      </Link>

      {!compact && (
        <button
          type="button"
          onClick={() => toggle(song.id)}
          aria-pressed={fav}
          aria-label={fav ? `Remove ${song.title} from favourites` : `Add ${song.title} to favourites`}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-colors',
            fav ? 'text-[var(--danger)]' : 'text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]'
          )}
        >
          <Heart aria-hidden className={cn('w-[18px] h-[18px]', fav && 'fill-current')} />
        </button>
      )}
    </div>
  )
})
