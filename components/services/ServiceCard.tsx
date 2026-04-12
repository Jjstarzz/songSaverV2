import Link from 'next/link'
import { ChevronRight, Music2, Globe, Lock } from 'lucide-react'
import { SERVICE_TYPES } from '@/types/database'
import { ServiceWithPreview } from '@/hooks/useServices'
import { cn } from '@/lib/utils'

interface ServiceCardProps {
  service: ServiceWithPreview
  past?: boolean
}

export function ServiceCard({ service, past }: ServiceCardProps) {
  const d = new Date(service.date + 'T00:00:00')
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()

  const sortedSongs = [...(service.service_songs ?? [])].sort((a, b) => a.order_index - b.order_index)
  const previewSongs = sortedSongs.slice(0, 3)
  const extraCount = sortedSongs.length - previewSongs.length

  return (
    <Link
      href={`/services/${service.id}`}
      className="glass-card-hover flex items-start gap-4 p-4 group"
    >
      {/* Date box */}
      <div className={cn(
        'w-12 shrink-0 rounded-xl border flex flex-col items-center justify-center py-1.5',
        past
          ? 'bg-[var(--bg-input)] border-[var(--border)]'
          : 'bg-emerald-500/10 border-emerald-500/20'
      )}>
        <span className={cn(
          'text-[10px] font-semibold uppercase leading-none',
          past ? 'text-[var(--fg-subtle)]' : 'text-emerald-400'
        )}>
          {month}
        </span>
        <span className={cn(
          'text-lg font-bold leading-tight',
          past ? 'text-[var(--fg-muted)]' : 'text-[var(--fg)]'
        )}>
          {day}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            'text-xs font-medium',
            service.status === 'draft' && 'text-[var(--fg-subtle)]',
            service.status === 'confirmed' && 'text-emerald-400',
            service.status === 'completed' && 'text-accent-400'
          )}>
            {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
          </span>
          <span className="text-[var(--fg-subtle)] text-xs">·</span>
          <span className="text-xs text-[var(--fg-muted)]">
            {SERVICE_TYPES[service.type]}
          </span>
          <span className="text-[var(--fg-subtle)] text-xs">·</span>
          {service.is_public ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400">
              <Globe className="w-2.5 h-2.5" /> Public
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--fg-subtle)]">
              <Lock className="w-2.5 h-2.5" /> Private
            </span>
          )}
        </div>

        <h3 className="text-sm font-semibold text-[var(--fg)] truncate">
          {service.theme || `${SERVICE_TYPES[service.type]} · ${month} ${day}`}
        </h3>

        {/* Setlist preview */}
        {sortedSongs.length > 0 ? (
          <div className="mt-1.5 space-y-0.5">
            {previewSongs.map((item, i) => (
              <p key={item.id} className="text-xs text-[var(--fg-muted)] truncate flex items-center gap-1.5">
                <span className="text-[var(--fg-subtle)] font-mono text-[10px] w-3 shrink-0">{i + 1}</span>
                {item.songs.title}
                {item.songs.artist && (
                  <span className="text-[var(--fg-subtle)] truncate">— {item.songs.artist}</span>
                )}
              </p>
            ))}
            {extraCount > 0 && (
              <p className="text-[10px] text-[var(--fg-subtle)] pl-4.5">+{extraCount} more</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--fg-subtle)] mt-1 flex items-center gap-1">
            <Music2 className="w-3 h-3" /> No songs added yet
          </p>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-[var(--fg-subtle)] group-hover:text-[var(--fg-muted)] transition-colors shrink-0 mt-1" />
    </Link>
  )
}
