'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Flame, Clock, Sparkles, Copy, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSongs } from '@/hooks/useSongs'
import { duplicateGroups } from '@/lib/songMatch'
import { todayLocal } from '@/lib/utils'
import type { SongWithLanguages } from '@/types/database'

const DAY = 86400000

function daysAgo(date: string) {
  return Math.round((Date.now() - new Date(date + 'T00:00:00').getTime()) / DAY)
}

function ago(date: string) {
  const d = daysAgo(date)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 14) return `${d} days ago`
  if (d < 60) return `${Math.round(d / 7)} weeks ago`
  return `${Math.round(d / 30)} months ago`
}

interface Row { song: SongWithLanguages; detail: string }

function Section({ icon: Icon, title, description, rows, empty, limit = 8 }: {
  icon: React.ComponentType<{ className?: string }>; title: string; description: string; rows: Row[]; empty: string; limit?: number
}) {
  const [all, setAll] = useState(false)
  const shown = all ? rows : rows.slice(0, limit)
  return (
    <section aria-labelledby={`ins-${title}`} className="surface p-4">
      <h2 id={`ins-${title}`} className="flex items-center gap-2 text-base font-semibold text-[var(--fg)]">
        <Icon aria-hidden className="w-4 h-4 text-[var(--accent-fg)]" /> {title}
        <span className="text-sm font-normal text-[var(--fg-subtle)]">· {rows.length}</span>
      </h2>
      <p className="text-sm text-[var(--fg-muted)] mt-0.5 mb-3">{description}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--fg-subtle)]">{empty}</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {shown.map(({ song, detail }) => (
            <li key={song.id}>
              <Link href={`/songs/${song.id}`} className="flex items-center justify-between gap-3 min-h-[48px] py-2 hover:text-[var(--accent-fg)]">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--fg)] truncate">{song.title}</span>
                  {song.artist && <span className="block text-xs text-[var(--fg-subtle)] truncate">{song.artist}</span>}
                </span>
                <span className="shrink-0 text-xs text-[var(--fg-muted)] tabular">{detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {rows.length > limit && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 min-h-[44px] text-sm font-medium text-[var(--accent-fg)]">
          {all ? 'Show fewer' : `Show all ${rows.length}`}
        </button>
      )}
    </section>
  )
}

/** Song rotation: what's been sung lately, what's on repeat, what's been forgotten. */
export default function InsightsPage() {
  const { songs, loading } = useSongs()

  const data = useMemo(() => {
    const today = todayLocal()
    const withDates = songs.map((s) => {
      const dates = (s.service_songs ?? [])
        .map((ss) => ss.services?.date)
        .filter((d): d is string => !!d && d <= today)
        .sort()
      return { song: s, dates, last: dates.at(-1) ?? null }
    })
    const recent = withDates
      .filter((x) => x.last && daysAgo(x.last) <= 31)
      .sort((a, b) => b.last!.localeCompare(a.last!))
      .map((x) => ({ song: x.song, detail: ago(x.last!) }))
    const sixMonths = withDates
      .map((x) => ({ ...x, n: x.dates.filter((d) => daysAgo(d) <= 183).length }))
      .filter((x) => x.n >= 2)
      .sort((a, b) => b.n - a.n || b.last!.localeCompare(a.last!))
      .map((x) => ({ song: x.song, detail: `${x.n}× in 6 months` }))
    const resting = withDates
      .filter((x) => x.last && daysAgo(x.last) > 90)
      .sort((a, b) => a.last!.localeCompare(b.last!))
      .map((x) => ({ song: x.song, detail: `last ${ago(x.last!)}` }))
    const never = withDates
      .filter((x) => !x.last && (x.song.song_lyrics?.length ?? 0) > 0)
      .sort((a, b) => a.song.title.localeCompare(b.song.title))
      .map((x) => ({ song: x.song, detail: 'never sung' }))
    return { recent, sixMonths, resting, never, dups: duplicateGroups(songs) }
  }, [songs])

  return (
    <div className="px-4 max-w-4xl">
      <PageHeader className="px-0" title="Song rotation" subtitle="What you've sung lately, what's on repeat, and what's been forgotten" />
      {loading ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Section icon={Clock} title="Sung recently" description="In a service during the last month." rows={data.recent} empty="Nothing sung in the last month." />
          <Section icon={Flame} title="On repeat" description="Sung twice or more in the last six months — maybe give them a rest." rows={data.sixMonths} empty="No songs repeated in the last six months." />
          <Section icon={TrendingUp} title="Ready to bring back" description="Not sung for over three months, oldest first." rows={data.resting} empty="Every song you've used has been sung in the last three months." />
          <Section icon={Sparkles} title="Never sung" description="Songs with lyrics that haven't been in a service yet." rows={data.never} empty="Every song with lyrics has been sung." />
          <section aria-labelledby="ins-dups" className="surface p-4 lg:col-span-2">
            <h2 id="ins-dups" className="flex items-center gap-2 text-base font-semibold text-[var(--fg)]">
              <Copy aria-hidden className="w-4 h-4 text-[var(--accent-fg)]" /> Possible duplicates
              <span className="text-sm font-normal text-[var(--fg-subtle)]">· {data.dups.length}</span>
            </h2>
            <p className="text-sm text-[var(--fg-muted)] mt-0.5 mb-3">
              Songs whose titles look alike, including different spellings of the same transliterated title. Open them to compare, then edit or delete the extra copy.
            </p>
            {data.dups.length === 0 ? (
              <p className="text-sm text-[var(--fg-subtle)]">No likely duplicates found.</p>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2">
                {data.dups.map((g) => (
                  <li key={g[0].id} className="rounded-xl border border-[var(--border)] p-3">
                    <ul className="space-y-1">
                      {g.map((s) => (
                        <li key={s.id}>
                          <Link href={`/songs/${s.id}`} className="text-sm text-[var(--fg)] hover:text-[var(--accent-fg)] hover:underline">
                            {s.title}
                          </Link>
                          <span className="text-xs text-[var(--fg-subtle)]">
                            {' '}· {(s.song_lyrics?.length ?? 0) > 0 ? `${s.song_lyrics.length} lyrics` : 'no lyrics'}{s.last_sung_date ? ` · sung ${ago(s.last_sung_date)}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
