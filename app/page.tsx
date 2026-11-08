'use client'

import { useMemo, useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, CalendarPlus, Plus, Clock, Heart, ChevronRight, CalendarDays, Music2, Globe, Lock } from 'lucide-react'
import { useSongs } from '@/hooks/useSongs'
import { useServices, type ServiceWithPreview } from '@/hooks/useServices'
import { useFavorites } from '@/hooks/useFavorites'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { useAuth } from '@/hooks/useAuth'
import { useSupabase } from '@/hooks/useSupabase'
import { SongCard } from '@/components/songs/SongCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { buttonVariants } from '@/components/ui/Button'
import { SERVICE_TYPES, SERVICE_STATUSES, Profile } from '@/types/database'
import { cn, todayLocal } from '@/lib/utils'

function dayDistance(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((new Date(dateStr + 'T00:00:00').getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${-diff} days ago`
  if (diff < 7) return `In ${diff} days`
  return `In ${Math.round(diff / 7)} week${diff >= 14 ? 's' : ''}`
}

function longDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

/** The next service, prominently, with its first songs and quick actions. */
function NextService({ service }: { service: ServiceWithPreview }) {
  const songs = [...(service.service_songs ?? [])].sort((a, b) => a.order_index - b.order_index)
  const typeLabel = SERVICE_TYPES[service.type]
  return (
    <section aria-labelledby="next-service" className="surface p-5">
      <p className="text-sm font-medium text-[var(--accent-fg)]">
        {dayDistance(service.date)} · {longDate(service.date)}
      </p>
      <h2 id="next-service" className="mt-1 text-xl font-semibold text-[var(--fg)] break-words">
        {service.theme || typeLabel}
      </h2>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--fg-muted)]">
        {service.theme && <span>{typeLabel}</span>}
        <span className={cn('chip', service.status === 'confirmed' && 'chip-success', service.status === 'completed' && 'chip-accent')}>
          {SERVICE_STATUSES[service.status]}
        </span>
        <span className="inline-flex items-center gap-1">
          {service.is_public ? <Globe aria-hidden className="w-3.5 h-3.5" /> : <Lock aria-hidden className="w-3.5 h-3.5" />}
          {service.is_public ? 'Public' : 'Private'}
        </span>
      </p>
      {songs.length > 0 ? (
        <ol className="mt-4 space-y-1.5">
          {songs.slice(0, 5).map((ss, i) => (
            <li key={ss.id} className="flex items-baseline gap-3 text-[15px]">
              <span aria-hidden className="w-5 text-right text-sm tabular text-[var(--fg-subtle)]">{i + 1}</span>
              <span className="min-w-0 truncate text-[var(--fg)]">{ss.songs?.title}</span>
            </li>
          ))}
          {songs.length > 5 && <li className="pl-8 text-sm text-[var(--fg-subtle)]">and {songs.length - 5} more</li>}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-[var(--fg-muted)]">No songs in the setlist yet.</p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/services/${service.id}`} className={buttonVariants({})}>
          Open service
        </Link>
      </div>
    </section>
  )
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = useSupabase()
  const { songs, loading: songsLoading } = useSongs()
  const { services, loading: servicesLoading } = useServices()
  const { isFavorite } = useFavorites()
  const { items: recentItems } = useRecentlyViewed()
  const [firstName, setFirstName] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('display_name').eq('id', user.id).single()
      .then(({ data }: { data: Pick<Profile, 'display_name'> | null }) => {
        const name = data?.display_name?.trim()
        if (name && name !== 'Worshiper') setFirstName(name.split(/\s+/)[0])
      })
  }, [user, supabase])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  }, [])

  const { upcoming, latest } = useMemo(() => {
    const today = todayLocal()
    const upcoming = services
      .filter((s) => s.date >= today && s.status !== 'completed')
      .sort((a, b) => a.date.localeCompare(b.date))
    const latest = services
      .filter((s) => s.date < today)
      .reduce<ServiceWithPreview | null>((best, s) => (!best || s.date > best.date ? s : best), null)
    return { upcoming, latest }
  }, [services])

  const favoriteSongs = useMemo(() => songs.filter((s) => isFavorite(s.id)).slice(0, 5), [songs, isFavorite])
  const recentSongs = useMemo(() => songs.slice(0, 5), [songs])

  const quickActions = [
    { href: '/songs', label: 'Find a song', icon: Search },
    { href: '/services/new', label: 'Plan a service', icon: CalendarPlus },
    { href: '/songs/new', label: 'Add a song', icon: Plus },
  ]

  return (
    <div className="px-4">
      <header className="page-top pb-5">
        <p className="text-sm text-[var(--fg-muted)]">{greeting}{firstName ? `, ${firstName}` : ''}</p>
        <h1 className="text-2xl lg:text-[28px] font-semibold tracking-tight text-[var(--fg)]">Home</h1>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 space-y-8 lg:space-y-0">
        {/* Left: what's next + actions */}
        <div className="space-y-6">
          {servicesLoading ? (
            <Skeleton className="h-56 w-full rounded-2xl" />
          ) : upcoming[0] ? (
            <NextService service={upcoming[0]} />
          ) : (
            <section aria-labelledby="no-upcoming" className="surface p-5">
              <CalendarDays aria-hidden className="w-6 h-6 text-[var(--fg-subtle)]" />
              <h2 id="no-upcoming" className="mt-3 text-lg font-semibold text-[var(--fg)]">No upcoming service</h2>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">
                Plan the next one to build its setlist, set keys and present it on Sunday.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/services/new" className={buttonVariants({})}>
                  <CalendarPlus aria-hidden className="w-4 h-4" /> Plan a service
                </Link>
                {latest && (
                  <Link href={`/services/${latest.id}`} className={buttonVariants({ variant: 'secondary' })}>
                    Open last service
                  </Link>
                )}
              </div>
              {latest && (
                <p className="mt-3 text-xs text-[var(--fg-subtle)]">
                  Last service: {latest.theme || SERVICE_TYPES[latest.type]} · {dayDistance(latest.date)}
                </p>
              )}
            </section>
          )}

          {upcoming.length > 1 && (
            <section aria-labelledby="later">
              <div className="flex items-center justify-between mb-2">
                <h2 id="later" className="section-label">Later</h2>
                <Link href="/services" className="text-sm font-medium text-[var(--accent-fg)] min-h-[44px] flex items-center">All services</Link>
              </div>
              <ul className="surface divide-y divide-[var(--border)]">
                {upcoming.slice(1, 4).map((s) => (
                  <li key={s.id}>
                    <Link href={`/services/${s.id}`} className="flex items-center gap-3 px-4 min-h-[56px] py-2 hover:bg-[var(--bg-hover)] first:rounded-t-2xl last:rounded-b-2xl">
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-[var(--fg)] truncate">{s.theme || SERVICE_TYPES[s.type]}</span>
                        <span className="block text-xs text-[var(--fg-subtle)]">{longDate(s.date)} · {s.service_songs?.length ?? 0} songs</span>
                      </span>
                      <span className="text-xs text-[var(--fg-muted)]">{dayDistance(s.date)}</span>
                      <ChevronRight aria-hidden className="w-4 h-4 text-[var(--fg-subtle)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <nav aria-label="Quick actions" className="grid grid-cols-3 gap-2">
            {quickActions.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="surface flex flex-col items-center justify-center gap-2 px-2 py-4 min-h-[88px] text-center text-sm font-medium text-[var(--fg)] hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                <Icon aria-hidden className="w-5 h-5 text-[var(--accent-fg)]" />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: songs you'll likely want */}
        <div className="space-y-8">
          {favoriteSongs.length > 0 && (
            <section aria-labelledby="favs">
              <div className="flex items-center justify-between mb-2">
                <h2 id="favs" className="section-label flex items-center gap-1.5"><Heart aria-hidden className="w-3.5 h-3.5" /> Favourites</h2>
              </div>
              <ul className="list-group">
                {favoriteSongs.map((song) => <li key={song.id}><SongCard song={song} compact /></li>)}
              </ul>
            </section>
          )}

          {recentItems.length > 0 && (
            <section aria-labelledby="recent">
              <h2 id="recent" className="section-label flex items-center gap-1.5 mb-2"><Clock aria-hidden className="w-3.5 h-3.5" /> Recently viewed</h2>
              <ul className="surface divide-y divide-[var(--border)]">
                {recentItems.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <Link href={`/songs/${item.id}`} className="flex items-center gap-3 px-4 min-h-[56px] py-2 hover:bg-[var(--bg-hover)] first:rounded-t-2xl last:rounded-b-2xl">
                      <Music2 aria-hidden className="w-4 h-4 text-[var(--fg-subtle)] shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-[var(--fg)] truncate">{item.title}</span>
                        {item.artist && <span className="block text-xs text-[var(--fg-subtle)] truncate">{item.artist}</span>}
                      </span>
                      <ChevronRight aria-hidden className="w-4 h-4 text-[var(--fg-subtle)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {favoriteSongs.length === 0 && recentItems.length === 0 && (
            <section aria-labelledby="recent-songs">
              <div className="flex items-center justify-between mb-2">
                <h2 id="recent-songs" className="section-label">Recently updated songs</h2>
                <Link href="/songs" className="text-sm font-medium text-[var(--accent-fg)] min-h-[44px] flex items-center">All songs</Link>
              </div>
              {songsLoading ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}</div>
              ) : recentSongs.length === 0 && !user && !authLoading ? (
                <p role="alert" className="surface p-5 text-sm text-[var(--fg-muted)]">Couldn&apos;t connect to your library. Check your connection and reload.</p>
              ) : recentSongs.length === 0 ? (
                <p className="surface p-5 text-sm text-[var(--fg-muted)]">No songs yet — add your first one.</p>
              ) : (
                <ul className="list-group">
                  {recentSongs.map((song) => <li key={song.id}><SongCard song={song} compact /></li>)}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
