import Link from 'next/link'
import { Globe, Lock, Music2 } from 'lucide-react'
import { SERVICE_TYPES, SERVICE_STATUSES } from '@/types/database'
import { ServiceWithPreview } from '@/hooks/useServices'
import { cn } from '@/lib/utils'

interface ServiceCardProps {
  service: ServiceWithPreview
  past?: boolean
  /** Current user's id — passed in so each card doesn't open its own auth subscription */
  currentUserId?: string | null
}

/**
 * Compact service card: date, title, type · leader · song count, then
 * status (Draft/Confirmed/Completed) and visibility (Public/Private) as
 * separate labels so they're never confused.
 */
export function ServiceCard({ service, past, currentUserId }: ServiceCardProps) {
  const d = new Date(service.date + 'T00:00:00')
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const isOwn = !!currentUserId && currentUserId === service.created_by
  const leader = service.creator_name ? (isOwn ? 'You' : service.creator_name) : null
  const songCount = service.service_songs?.length ?? 0
  const typeLabel = SERVICE_TYPES[service.type]
  // A past service still marked "draft" just wasn't updated — don't shout about it
  const showStatus = !(past && service.status === 'draft')

  return (
    <Link
      href={`/services/${service.id}`}
      className="glass-card-hover flex items-start gap-3.5 p-3.5"
    >
      <span
        aria-hidden
        className={cn(
          'w-14 shrink-0 rounded-xl flex flex-col items-center justify-center py-1.5 border',
          past ? 'border-[var(--border)] text-[var(--fg-subtle)]' : 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-fg)]'
        )}
      >
        <span className="text-[10px] font-semibold uppercase leading-tight">{weekday}</span>
        <span className="text-xl font-semibold leading-tight tabular">{day}</span>
        <span className="text-[10px] font-medium uppercase leading-tight">{month}</span>
      </span>

      <span className="flex-1 min-w-0">
        <span className="sr-only">{d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}: </span>
        <span className="block text-[15px] font-semibold text-[var(--fg)] leading-snug line-clamp-2 break-words">
          {service.theme || typeLabel}
        </span>
        <span className="block text-sm text-[var(--fg-muted)] mt-0.5 truncate">
          {[service.theme ? typeLabel : null, leader].filter(Boolean).join(' · ')}
        </span>
        <span className="flex flex-wrap items-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1 text-xs text-[var(--fg-muted)]">
            <Music2 aria-hidden className="w-3.5 h-3.5" />
            {songCount} {songCount === 1 ? 'song' : 'songs'}
          </span>
          {showStatus && (
            <span className={cn('chip', service.status === 'confirmed' && 'chip-success', service.status === 'completed' && 'chip-accent')}>
              {SERVICE_STATUSES[service.status]}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-[var(--fg-subtle)]">
            {service.is_public ? <Globe aria-hidden className="w-3.5 h-3.5" /> : <Lock aria-hidden className="w-3.5 h-3.5" />}
            {service.is_public ? 'Public' : 'Private'}
          </span>
        </span>
      </span>
    </Link>
  )
}
