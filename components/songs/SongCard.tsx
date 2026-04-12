'use client'

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

export function SongCard({ song, compact, userKey }: SongCardProps) {
  const { isFavorite, toggle } = useFavorites()
  const fav = isFavorite(song.id)
  const languages = song.song_lyrics?.map((l) => l.language) ?? []

  return (
    <div className="relative">
      <Link
        href={`/songs/${song.id}`}
        className={cn(
          'glass-card-hover flex items-center gap-4 transition-all duration-200 group',
          compact ? 'p-3' : 'p-4'
        )}
      >
        {/* Icon */}
        <div className={cn(
          'shrink-0 rounded-xl bg-accent-500/15 border border-accent-500/20 flex items-center justify-center text-accent-400',
          compact ? 'w-9 h-9' : 'w-11 h-11'
        )}>
          <Music2 className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <h3 className={cn(
            'font-semibold text-white truncate',
            compact ? 'text-sm' : 'text-base'
          )}>
            {song.title}
          </h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {song.artist && (
              <span className="text-xs text-white/50 truncate">{song.artist}</span>
            )}
            {(song.default_key || song.preferred_key || userKey) && (
              <>
                <span className="text-xs text-white/30">·</span>
                {userKey ? (
                  <span className="text-xs font-medium text-emerald-400">
                    {formatKey(userKey, song.mode)}
                    {(song.preferred_key || song.default_key) && userKey !== (song.preferred_key || song.default_key) && (
                      <span className="text-white/30 font-normal"> ({formatKey(song.preferred_key || song.default_key, song.mode)})</span>
                    )}
                  </span>
                ) : (
                  <span className="text-xs text-white/50">{formatKey(song.preferred_key || song.default_key, song.mode)}</span>
                )}
              </>
            )}
            {song.bpm && (
              <>
                <span className="text-xs text-white/30">·</span>
                <span className="text-xs text-white/50">{song.bpm} BPM</span>
              </>
            )}
            {song.time_signature && (
              <>
                <span className="text-xs text-white/30">·</span>
                <span className="text-xs text-white/50">{song.time_signature}</span>
              </>
            )}
          </div>

          {/* Tags */}
          {!compact && song.tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {song.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="tag-pill">{tag}</span>
              ))}
              {song.tags.length > 3 && (
                <span className="text-xs text-white/30 self-center">+{song.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* Language badges */}
          {!compact && languages.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {languages.slice(0, 4).map((lang) => (
                <span
                  key={lang}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                >
                  {LANGUAGE_NAMES[lang] ?? lang.toUpperCase()}
                </span>
              ))}
              {languages.length > 4 && (
                <span className="text-[10px] text-white/30 self-center">+{languages.length - 4}</span>
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
}
