'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useEffect, useState } from 'react'
import Link from 'next/link'
import { Music2, CalendarDays, Mic2, Plus, Heart, Clock, ChevronRight, TrendingUp } from 'lucide-react'
import { useSongs } from '@/hooks/useSongs'
import { useServices } from '@/hooks/useServices'
import { useFavorites } from '@/hooks/useFavorites'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { useAuth } from '@/hooks/useAuth'
import { useSupabase } from '@/hooks/useSupabase'
import { SongCard } from '@/components/songs/SongCard'
import { SERVICE_TYPES, Profile } from '@/types/database'
import { cn } from '@/lib/utils'

function StatCard({ icon: Icon, label, value, href, color }: {
  icon: React.ElementType
  label: string
  value: number | string
  href: string
  color: string
}) {
  return (
    <Link href={href} className="glass-card-hover p-4 flex flex-col gap-2">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>
        <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--fg)]">{value}</p>
        <p className="text-xs text-[var(--fg-muted)]">{label}</p>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const supabase = useSupabase()
  const { songs, loading: songsLoading } = useSongs()
  const { services, loading: servicesLoading } = useServices()
  const { favorites, isFavorite } = useFavorites()
  const { items: recentItems } = useRecentlyViewed()
  const [firstName, setFirstName] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('display_name').eq('id', user.id).single()
      .then(({ data }: { data: Pick<Profile, 'display_name'> | null }) => {
        if (data?.display_name) {
          // Take only the first word as the first name
          setFirstName(data.display_name.trim().split(/\s+/)[0])
        }
      })
  }, [user, supabase])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const upcomingServices = useMemo(() => {
    const now = new Date().toISOString().split('T')[0]
    return services
      .filter((s) => s.date >= now && s.status !== 'completed')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3)
  }, [services])

  const favoriteSongs = useMemo(
    () => songs.filter((s) => isFavorite(s.id)).slice(0, 5),
    [songs, isFavorite]
  )

  const recentSongs = useMemo(
    () => songs.slice(0, 5),
    [songs]
  )

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const daysUntil = (dateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateStr + 'T00:00:00')
    const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return `In ${diff} days`
  }

  return (
    <div className="px-4 pb-8">
      {/* Header */}
      <div className="pt-12 pb-6">
        <p className="text-sm text-[var(--fg-muted)]">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </p>
        <h1 className="text-2xl font-bold text-[var(--fg)] mt-0.5">SongSaver</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={Music2}
          label="Songs"
          value={songsLoading ? '…' : songs.length}
          href="/songs"
          color="bg-accent-500/15 text-accent-400"
        />
        <StatCard
          icon={CalendarDays}
          label="Upcoming"
          value={servicesLoading ? '…' : upcomingServices.length}
          href="/services"
          color="bg-emerald-500/15 text-emerald-400"
        />
        <StatCard
          icon={Heart}
          label="Favourites"
          value={favorites.size}
          href="/songs"
          color="bg-red-500/15 text-red-400"
        />
      </div>

      {/* Upcoming services */}
      {!servicesLoading && upcomingServices.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Upcoming Services</p>
            <Link href="/services" className="text-xs text-accent-400">See all</Link>
          </div>
          <div className="space-y-2">
            {upcomingServices.map((service) => (
              <Link
                key={service.id}
                href={`/services/${service.id}`}
                className="glass-card-hover flex items-center gap-3 p-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--fg)] truncate">
                    {service.theme || SERVICE_TYPES[service.type]}
                  </p>
                  <p className="text-xs text-[var(--fg-muted)]">{formatDate(service.date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-emerald-400 font-medium">{daysUntil(service.date)}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--fg-subtle)]" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Favourite songs */}
      {favoriteSongs.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Favourites</p>
            <Link href="/songs" className="text-xs text-accent-400">See all</Link>
          </div>
          <div className="space-y-2">
            {favoriteSongs.map((song) => (
              <SongCard key={song.id} song={song} compact />
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      {recentItems.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Recently Viewed
            </p>
          </div>
          <div className="space-y-2">
            {recentItems.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/songs/${item.id}`}
                className="glass-card-hover flex items-center gap-3 p-3"
              >
                <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center shrink-0">
                  <Music2 className="w-4 h-4 text-accent-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--fg)] truncate">{item.title}</p>
                  {item.artist && (
                    <p className="text-xs text-[var(--fg-muted)] truncate">{item.artist}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--fg-subtle)]" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent songs (fallback when nothing above) */}
      {favoriteSongs.length === 0 && recentItems.length === 0 && !songsLoading && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" /> Recent Songs
            </p>
            <Link href="/songs" className="text-xs text-accent-400">See all</Link>
          </div>
          {recentSongs.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <Music2 className="w-8 h-8 text-[var(--fg-subtle)] mx-auto mb-3" />
              <p className="text-sm font-medium text-[var(--fg)]">No songs yet</p>
              <p className="text-xs text-[var(--fg-muted)] mt-1">Add your first song to get started</p>
              <Link href="/songs/new" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-accent-600 text-white text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Song
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSongs.map((song) => (
                <SongCard key={song.id} song={song} compact />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Quick actions FAB row */}
      <div className="fixed bottom-24 right-4 flex flex-col gap-2 z-40">
        <Link
          href="/songs/new"
          className="w-14 h-14 rounded-full bg-accent-600 shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform"
          aria-label="Add song"
        >
          <Plus className="w-6 h-6" />
        </Link>
      </div>
    </div>
  )
}
