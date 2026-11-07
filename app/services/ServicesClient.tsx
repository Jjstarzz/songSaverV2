'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, CalendarDays, Clock, Search, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ServiceCard } from '@/components/services/ServiceCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ServiceCardSkeleton } from '@/components/ui/Skeleton'
import { useServices, type ServiceWithPreview } from '@/hooks/useServices'
import { useAuth } from '@/hooks/useAuth'
import { SERVICE_TYPES } from '@/types/database'
import { cn, todayLocal } from '@/lib/utils'

const PAST_PREVIEW = 10

/** Text a search can match: theme, notes, type, date, creator and song titles. */
function searchableText(s: ServiceWithPreview): string {
  const date = new Date(s.date + 'T00:00:00')
  return [
    s.theme,
    s.notes,
    SERVICE_TYPES[s.type as keyof typeof SERVICE_TYPES],
    s.date,
    date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    s.creator_name,
    ...(s.service_songs ?? []).map((ss) => ss.songs?.title),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function ServicesClient() {
  const { services, loading } = useServices()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [showMine, setShowMine] = useState(false)
  const [showAllPast, setShowAllPast] = useState(false)
  const deferredQuery = useDeferredValue(query)

  const today = todayLocal()

  const { upcoming, past } = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    const matching = services.filter((s) => {
      if (showMine && s.created_by !== user?.id) return false
      if (q && !searchableText(s).includes(q)) return false
      return true
    })

    const upcoming = matching
      .filter((s) => s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date)) // soonest first

    const past = matching
      .filter((s) => s.date < today)
      .sort((a, b) => b.date.localeCompare(a.date)) // most recent first

    return { upcoming, past }
  }, [services, today, deferredQuery, showMine, user?.id])

  const filtering = deferredQuery.trim() !== '' || showMine
  // While searching, show every match; otherwise keep the past list short
  const visiblePast = filtering || showAllPast ? past : past.slice(0, PAST_PREVIEW)

  return (
    <div className="px-4">
      <PageHeader
        title="Services"
        subtitle={loading ? '' : `${services.length} total`}
        action={
          <Link href="/services/new">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              New
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-7 h-7" />}
          title="No services yet"
          description="Plan your first worship service and build your setlist"
          action={
            <Link href="/services/new">
              <Button>
                <Plus className="w-4 h-4" />
                Create Service
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Search + filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-subtle)] pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services…"
                aria-label="Search services"
                className="input-base pl-10 pr-10"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowMine((v) => !v)}
              aria-pressed={showMine}
              className={cn(
                'shrink-0 px-4 rounded-xl border text-sm font-medium transition-colors',
                showMine
                  ? 'bg-accent-500/15 border-accent-500/30 text-accent-400'
                  : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)]'
              )}
            >
              Mine
            </button>
          </div>

          {filtering && upcoming.length === 0 && past.length === 0 && (
            <EmptyState
              icon={<Search className="w-7 h-7" />}
              title="No services match"
              description="Try a different theme, date or song title"
            />
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <p className="section-label flex items-center gap-1.5 mb-3">
                <CalendarDays className="w-3.5 h-3.5" />
                Upcoming
              </p>
              <div className="space-y-2.5">
                {upcoming.map((service) => (
                  <ServiceCard key={service.id} service={service} currentUserId={user?.id} />
                ))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              <p className="section-label flex items-center gap-1.5 mb-3">
                <Clock className="w-3.5 h-3.5" />
                Past Services
                <span className="normal-case tracking-normal font-normal">· {past.length}</span>
              </p>
              <div className="space-y-2.5">
                {visiblePast.map((service) => (
                  <ServiceCard key={service.id} service={service} past currentUserId={user?.id} />
                ))}
              </div>
              {visiblePast.length < past.length && (
                <Button
                  variant="secondary"
                  className="w-full mt-3"
                  onClick={() => setShowAllPast(true)}
                >
                  Show all {past.length} past services
                </Button>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
