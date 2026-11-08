'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Plus, Trash2, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmModal } from '@/components/ui/Modal'
import { FeatureNotice } from '@/components/ui/FeatureNotice'
import { Skeleton } from '@/components/ui/Skeleton'
import { toast } from '@/components/ui/Toaster'
import { useFeatureTable } from '@/hooks/useFeatureTable'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import { useSongs } from '@/hooks/useSongs'
import { MUSICAL_KEYS } from '@/types/database'
import type { Singer, SingerSongKey } from '@/lib/features'
import { cn } from '@/lib/utils'

/** Add a song + key for one singer */
function AddKey({ singer, existing, onAdded }: { singer: Singer; existing: Set<string>; onAdded: () => void }) {
  const supabase = useSupabase()
  const { songs } = useSongs()
  const [q, setQ] = useState('')
  const [songId, setSongId] = useState<string | null>(null)
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s.length < 2 ? [] : songs.filter((x) => !existing.has(x.id) && x.title.toLowerCase().includes(s)).slice(0, 6)
  }, [q, songs, existing])
  const chosen = songs.find((s) => s.id === songId)

  const save = async () => {
    if (!songId || !key) return
    setSaving(true)
    const { error } = await supabase.from('singer_song_keys').upsert({ singer_id: singer.id, song_id: songId, key }, { onConflict: 'singer_id,song_id' })
    setSaving(false)
    if (error) { toast.error('Could not save the key'); return }
    toast.success(`${singer.name}: ${chosen?.title} in ${key}`)
    setQ(''); setSongId(null); setKey(''); onAdded()
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-3 space-y-3">
      {chosen ? (
        <p className="text-sm text-[var(--fg)]">
          {chosen.title}{' '}
          <button type="button" onClick={() => setSongId(null)} className="text-[var(--accent-fg)] text-sm underline">change</button>
        </p>
      ) : (
        <div className="relative">
          <Input label="Song" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Start typing a song title" />
          {matches.length > 0 && (
            <ul className="mt-1 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] overflow-hidden">
              {matches.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => { setSongId(s.id); setKey(s.preferred_key || s.default_key || '') }} className="w-full text-left px-3 min-h-[44px] text-sm text-[var(--fg)] hover:bg-[var(--bg-hover)]">
                    {s.title}{s.artist ? <span className="text-[var(--fg-subtle)]"> — {s.artist}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div role="group" aria-label="Key" className="flex flex-wrap gap-1.5">
        {MUSICAL_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={key === k}
            onClick={() => setKey(k)}
            className={cn('w-11 h-9 rounded-lg border text-sm font-medium', key === k ? 'bg-accent-600 border-accent-600 text-white' : 'border-[var(--border)] bg-[var(--bg-input)] text-[var(--fg-muted)]')}
          >
            {k}
          </button>
        ))}
      </div>
      <Button size="sm" onClick={save} disabled={!songId || !key} loading={saving}>Save key</Button>
    </div>
  )
}

function SingerCard({ singer, keys, canEdit, onChange, onDelete }: {
  singer: Singer; keys: SingerSongKey[]; canEdit: boolean; onChange: () => void; onDelete: () => void
}) {
  const supabase = useSupabase()
  const { songs } = useSongs()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const title = (id: string) => songs.find((s) => s.id === id)?.title ?? 'Song'
  const removeKey = async (k: SingerSongKey) => {
    const { error } = await supabase.from('singer_song_keys').delete().eq('id', k.id)
    if (error) toast.error('Could not remove'); else onChange()
  }
  return (
    <li className="surface">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center gap-3 p-4 text-left min-h-[64px]">
        <span aria-hidden className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-fg)] flex items-center justify-center font-semibold">
          {singer.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold text-[var(--fg)]">{singer.name}</span>
          <span className="block text-sm text-[var(--fg-muted)]">
            {[singer.voice, `${keys.length} ${keys.length === 1 ? 'key' : 'keys'} saved`].filter(Boolean).join(' · ')}
          </span>
        </span>
        <ChevronDown aria-hidden className={cn('w-5 h-5 text-[var(--fg-subtle)] transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {singer.notes && <p className="text-sm text-[var(--fg-muted)] whitespace-pre-wrap">{singer.notes}</p>}
          {keys.length > 0 ? (
            <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center gap-3 px-3 min-h-[48px]">
                  <Link href={`/songs/${k.song_id}`} className="flex-1 min-w-0 truncate text-sm text-[var(--fg)] hover:text-[var(--accent-fg)]">{title(k.song_id)}</Link>
                  <span className="text-sm font-semibold tabular text-[var(--success)] w-10 text-right">{k.key}</span>
                  {canEdit && (
                    <button type="button" onClick={() => removeKey(k)} aria-label={`Remove ${singer.name}'s key for ${title(k.song_id)}`} className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--fg-subtle)] hover:text-[var(--danger)]">
                      <Trash2 aria-hidden className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--fg-subtle)]">No keys saved yet.</p>
          )}
          {canEdit && (adding
            ? <AddKey singer={singer} existing={new Set(keys.map((k) => k.song_id))} onAdded={() => { onChange(); setAdding(false) }} />
            : (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus aria-hidden className="w-4 h-4" /> Add a song key</Button>
                <Button size="sm" variant="ghost" onClick={onDelete} className="text-[var(--danger)]">Remove singer</Button>
              </div>
            ))}
        </div>
      )}
    </li>
  )
}

export default function SingersPage() {
  const supabase = useSupabase()
  const { user } = useAuth()
  const singers = useFeatureTable<Singer>('singers', { order: ['name', { ascending: true }] })
  const keys = useFeatureTable<SingerSongKey>('singer_song_keys', { skip: singers.missing })
  const [name, setName] = useState('')
  const [voice, setVoice] = useState('')
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Singer | null>(null)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('singers').insert({ name: name.trim(), voice: voice.trim() || null })
    setSaving(false)
    if (error) { toast.error('Could not add singer'); return }
    toast.success(`Added ${name.trim()}`)
    setName(''); setVoice(''); singers.refetch()
  }

  const remove = async () => {
    if (!toDelete) return
    const { error } = await supabase.from('singers').delete().eq('id', toDelete.id)
    if (error) toast.error('Could not remove singer'); else { toast.success(`Removed ${toDelete.name}`); singers.refetch(); keys.refetch() }
    setToDelete(null)
  }

  return (
    <div className="px-4 max-w-3xl">
      <PageHeader className="px-0" title="Singers" subtitle="Who sings, and the key each person is comfortable in for each song" />
      {singers.missing ? (
        <FeatureNotice feature="Singers and their keys" />
      ) : (
        <div className="space-y-6">
          <form onSubmit={add} className="surface p-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anna" required />
            <Input label="Voice (optional)" value={voice} onChange={(e) => setVoice(e.target.value)} placeholder="e.g. Alto, low A – high E" />
            <Button type="submit" loading={saving} disabled={!name.trim()}><Plus aria-hidden className="w-4 h-4" /> Add singer</Button>
          </form>

          {singers.loading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
          ) : singers.rows.length === 0 ? (
            <div className="text-center py-10 text-[var(--fg-muted)]">
              <UserRound aria-hidden className="w-7 h-7 mx-auto mb-2 text-[var(--fg-subtle)]" />
              No singers yet. Add your vocalists above, then save the key each one sings every song in.
            </div>
          ) : (
            <ul className="space-y-2">
              {singers.rows.map((s) => (
                <SingerCard
                  key={s.id}
                  singer={s}
                  keys={keys.rows.filter((k) => k.singer_id === s.id)}
                  canEdit={s.created_by === user?.id || s.user_id === user?.id}
                  onChange={keys.refetch}
                  onDelete={() => setToDelete(s)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={`Remove ${toDelete?.name ?? 'singer'}?`}
        description="Their saved keys are removed too. Services they were assigned to keep everything else."
        confirmLabel="Remove singer"
      />
    </div>
  )
}
