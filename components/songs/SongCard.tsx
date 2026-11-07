'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Music2, Heart, ChevronRight } from 'lucide-react'
import { SongWithLanguages, LANGUAGE_NAMES, formatKey } from '@/types/database'
import { useFavorites } from '@/hooks/useFavorites'
import { cn } from '@/lib/utils'

interface SongCardProps {
  song: SongWithLanguages
  compact?: boolean
  userKey?: string
}

export const SongCard = memo(function SongCard({ song, compact, userKey }: SongCardProps) {
  const { isFavorite, toggle } = useFavorites()
  const fav = isFavorite(song.id)
  // One de-duplicated list of languages (original + every lyrics version)
  const languages = [...new Set([
    ...(song.original_language ? [song.original_language] : []),
    ...(song.song_lyrics?.map((l) => l.language) ?? []),
  ])]
  const hasLyrics = (song.song_lyrics?.length ?? 0) > 0
  const key = userKey || song.preferred_key || song.default_key
  const keyShort = key ? `${key}${song.mode === 'minor' ? 'm' : ''}` : null

  const meta = [
    song.artist,
    song.time_signature,
    !compact && song.last_sung_date
      ? `Sung ${new Date(song.last_sung_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      : null,
  ].filter(Boolean) as string[]

  return (
    <div className="relative">
      <Link
        href={`/songs/${song.id}`}
        className={cn(
          'glass-card-hover flex items-center gap-3 transition-all duration-200 group',
          compact ? 'p-2.5' : 'p-3'
        )}
      >
        {/* Key tile — the song's key at a glance (green when it's your personal key) */}
        <div
          className={cn(
            'shrink-0 rounded-xl border flex items-center justify-center font-bold tabular-nums',
            compact ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm',
            userKey
              ? 'bg-emerald-500/12 border-emerald-500/25 text-emerald-400'
              : keyShort
                ? 'bg-accent-500/12 border-accent-500/20 text-accent-400'
                : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-subtle)]'
          )}
          title={key ? `${formatKey(key, song.mode)}${userKey ? ' (your key)' : ''}` : 'No key set'}
        >
          {keyShort ?? <Music2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
        </div>

        {/* Content */}
        <div className={cn('flex-1 min-w-0', !compact && 'pr-8')}>
          <h3 className="text-[15px] font-semibold text-[var(--fg)] truncate leading-snug">
            {song.title}
          </h3>

          {meta.length > 0 && (
            <p className="text-xs text-[var(--fg-muted)] truncate mt-0.5">
              {meta.join('  ·  ')}
            </p>
          )}

          {!compact && (song.tags.length > 0 || languages.length > 0 || !hasLyrics) && (
            <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
              {song.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="tag-pill">{tag}</span>
              ))}
              {song.tags.length > 2 && (
                <span className="text-[10px] text-[var(--fg-subtle)]">+{song.tags.length - 2}</span>
              )}
              {languages.length > 0 && (
                <span
                  className="text-[10px] font-semibold tracking-wider text-[var(--fg-subtle)] uppercase"
                  title={languages.map((l) => LANGUAGE_NAMES[l] ?? l).join(', ')}
                >
                  {languages.join(' · ')}
                </span>
              )}
              {!hasLyrics && (
                <span className="text-[10px] font-medium text-amber-400">No lyrics</span>
              )}
            </div>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-[var(--fg-subtle)] group-hover:text-[var(--fg-muted)] transition-colors shrink-0" />
      </Link>

      {/* Favourite button — overlaid so it doesn't trigger navigation */}
      {!compact && (
        <button
          onClick={(e) => { e.preventDefault(); toggle(song.id) }}
          className={cn(
            'absolute right-[34px] top-1/2 -translate-y-1/2 p-3 rounded-full transition-all duration-200',
            fav
              ? 'text-red-400 hover:text-red-300'
              : 'text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]'
          )}
          aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Heart className={cn('w-4 h-4', fav && 'fill-current')} />
        </button>
      )}
    </div>
  )
})
