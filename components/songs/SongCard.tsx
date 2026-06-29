'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Music2, Heart, ChevronRight } from 'lucide-react'
import { SongWithLanguages, LANGUAGE_NAMES, formatKey } from '@/types/database'
import { useFavorites } from '@/hooks/useFavorites'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface SongCardProps {
  song: SongWithLanguages
  compact?: boolean
  userKey?: string
}

export const SongCard = memo(function SongCard({ song, compact, userKey }: SongCardProps) {
  const { isFavorite, toggle } = useFavorites()
  const { user } = useAuth()
  const fav = isFavorite(song.id)
  const isOwn = user?.id === song.created_by
  const creatorLabel = song.creator_name
    ? isOwn ? 'You' : song.creator_name
    : null
  const languages = song.song_lyrics?.map((l) => l.language) ?? []

  const hasMeta = !!(song.default_key || song.preferred_key || userKey || song.bpm || song.time_signature || song.artist)
  const hasTagsOrLangs = !compact && (song.tags.length > 0 || song.original_language || languages.length > 0)

  return (
    <div className="relative">
      <Link
        href={`/songs/${song.id}`}
        className={cn(
          'glass-card-hover flex items-center gap-3 transition-all duration-200 group',
          compact ? 'p-2.5' : 'p-3'
        )}
      >
        {/* Icon */}
        <div className={cn(
          'shrink-0 rounded-xl bg-accent-500/15 border border-accent-500/20 flex items-center justify-center text-accent-400',
          compact ? 'w-8 h-8' : 'w-10 h-10'
        )}>
          <Music2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="text-sm font-semibold text-white truncate leading-snug">
            {song.title}
          </h3>

          {/* Meta row: artist · key · time */}
          {hasMeta && (
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {song.artist && (
                <span className="text-[11px] text-white/45 truncate">{song.artist}</span>
              )}
              {(song.default_key || song.preferred_key || userKey) && (
                <>
                  {song.artist && <span className="text-[11px] text-white/25">·</span>}
                  {userKey ? (
                    <span className="text-[11px] font-medium text-emerald-400">
                      {formatKey(userKey, song.mode)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-white/45">{formatKey(song.preferred_key || song.default_key, song.mode)}</span>
                  )}
                </>
              )}
              {song.time_signature && (
                <>
                  <span className="text-[11px] text-white/25">·</span>
                  <span className="text-[11px] text-white/45">{song.time_signature}</span>
                </>
              )}
              {!compact && song.last_sung_date && (
                <>
                  <span className="text-[11px] text-white/25">·</span>
                  <span className="text-[10px] text-white/30">
                    {new Date(song.last_sung_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Tags + languages on one row */}
          {hasTagsOrLangs && (
            <div className="flex gap-1 mt-1 flex-wrap items-center">
              {song.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="tag-pill">{tag}</span>
              ))}
              {song.original_language && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/15">
                  {LANGUAGE_NAMES[song.original_language] ?? song.original_language.toUpperCase()}
                </span>
              )}
              {languages.slice(0, 3).map((lang) => (
                <span key={lang} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                  {LANGUAGE_NAMES[lang] ?? lang.toUpperCase()}
                </span>
              ))}
              {(song.tags.length > 2 || languages.length > 3) && (
                <span className="text-[10px] text-white/30">+{(song.tags.length - 2) + Math.max(0, languages.length - 3)}</span>
              )}
            </div>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
      </Link>

      {/* Favourite button — overlaid so it doesn't trigger navigation */}
      {!compact && (
        <button
          onClick={(e) => { e.preventDefault(); toggle(song.id) }}
          className={cn(
            'absolute right-10 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all duration-200',
            fav
              ? 'text-red-400 hover:text-red-300'
              : 'text-white/20 hover:text-white/50'
          )}
          aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Heart className={cn('w-4 h-4', fav && 'fill-current')} />
        </button>
      )}
    </div>
  )
})
