'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Layers, Mic, MessageSquareText, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { FeatureNotice } from '@/components/ui/FeatureNotice'
import { toast } from '@/components/ui/Toaster'
import { useFeatureTable } from '@/hooks/useFeatureTable'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import { MUSICAL_KEYS } from '@/types/database'
import type { Arrangement, Feedback, Singer, SingerSongKey } from '@/lib/features'

const keyOptions = [{ value: '', label: '— Same as song —' }, ...MUSICAL_KEYS.map((k) => ({ value: k, label: k }))]

function Heading({ icon: Icon, children, action }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <h2 className="section-label flex items-center gap-1.5"><Icon aria-hidden className="w-3.5 h-3.5" /> {children}</h2>
      {action}
    </div>
  )
}

/* ─── Arrangement versions ─── */
export function SongArrangements({ songId, songOwner, canEditSong }: { songId: string; songOwner: string; canEditSong: boolean }) {
  const supabase = useSupabase()
  const { user } = useAuth()
  const arr = useFeatureTable<Arrangement>('song_arrangements', { eq: { song_id: songId }, order: ['created_at', { ascending: true }] })
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ name: '', key: '', tempo: '', structure: '', intro: '', ending: '', notes: '' })
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  if (arr.missing) return <section><Heading icon={Layers}>Arrangements</Heading><FeatureNotice feature="Arrangement versions" /></section>

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return
    const tempo = f.tempo ? parseInt(f.tempo, 10) : null
    if (tempo !== null && (!Number.isFinite(tempo) || tempo <= 0 || tempo >= 400)) { toast.error('Tempo must be between 1 and 399'); return }
    setSaving(true)
    const { error } = await supabase.from('song_arrangements').insert({
      song_id: songId, name: f.name.trim(), key: f.key || null, tempo,
      structure: f.structure.trim() || null, intro: f.intro.trim() || null, ending: f.ending.trim() || null, notes: f.notes.trim() || null,
    })
    setSaving(false)
    if (error) { toast.error('Could not save arrangement'); return }
    toast.success('Arrangement saved')
    setF({ name: '', key: '', tempo: '', structure: '', intro: '', ending: '', notes: '' })
    setAdding(false); arr.refetch()
  }
  const remove = async (a: Arrangement) => {
    const { error } = await supabase.from('song_arrangements').delete().eq('id', a.id)
    if (error) toast.error('Could not delete'); else { toast.success(`Deleted “${a.name}”`); arr.refetch() }
  }

  return (
    <section aria-label="Arrangements">
      <Heading icon={Layers} action={!adding && (
        <button type="button" onClick={() => setAdding(true)} className="min-h-[44px] text-sm font-medium text-[var(--accent-fg)] flex items-center gap-1">
          <Plus aria-hidden className="w-4 h-4" /> Add<span className="sr-only"> arrangement</span>
        </button>
      )}>Arrangements</Heading>
      {arr.rows.length === 0 && !adding && (
        <p className="text-sm text-[var(--fg-subtle)]">One song, different versions — e.g. &ldquo;Acoustic in D&rdquo; or &ldquo;Full band, extended ending&rdquo;.</p>
      )}
      <ul className="space-y-2">
        {arr.rows.map((a) => (
          <li key={a.id} className="surface p-3 text-sm">
            <div className="flex items-start gap-2">
              <p className="flex-1 font-semibold text-[var(--fg)]">{a.name}</p>
              {(a.key || a.tempo) && <span className="tabular text-[var(--fg-muted)]">{[a.key, a.tempo ? `${a.tempo} BPM` : null].filter(Boolean).join(' · ')}</span>}
              {(a.created_by === user?.id || songOwner === user?.id || canEditSong) && (
                <button type="button" onClick={() => remove(a)} aria-label={`Delete arrangement ${a.name}`} className="w-9 h-9 -m-1.5 flex items-center justify-center rounded-lg text-[var(--fg-subtle)] hover:text-[var(--danger)]">
                  <Trash2 aria-hidden className="w-4 h-4" />
                </button>
              )}
            </div>
            {a.structure && <p className="mt-1 text-[var(--fg)] tabular">{a.structure}</p>}
            {(a.intro || a.ending) && (
              <p className="mt-1 text-[var(--fg-muted)]">{[a.intro && `Intro: ${a.intro}`, a.ending && `Ending: ${a.ending}`].filter(Boolean).join(' · ')}</p>
            )}
            {a.notes && <p className="mt-1 text-[var(--fg-muted)] whitespace-pre-wrap">{a.notes}</p>}
          </li>
        ))}
      </ul>
      {adding && (
        <form onSubmit={save} className="surface p-3 mt-2 space-y-3">
          <Input label="Name *" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Acoustic in D" required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Key" value={f.key} onChange={(e) => set('key', e.target.value)} options={keyOptions} />
            <Input label="Tempo (BPM)" type="number" inputMode="numeric" value={f.tempo} onChange={(e) => set('tempo', e.target.value)} placeholder="72" />
          </div>
          <Input label="Structure" value={f.structure} onChange={(e) => set('structure', e.target.value)} placeholder="Intro · V1 · C · V2 · C · B · C ×2 · Tag" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Intro" value={f.intro} onChange={(e) => set('intro', e.target.value)} placeholder="Keys only, 4 bars" />
            <Input label="Ending" value={f.ending} onChange={(e) => set('ending', e.target.value)} placeholder="Repeat tag, ring out" />
          </div>
          <Textarea label="Notes" value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="min-h-[72px]" />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={saving} disabled={!f.name.trim()}>Save arrangement</Button>
          </div>
        </form>
      )}
    </section>
  )
}

/* ─── Singers' keys for this song ─── */
export function SongSingerKeys({ songId }: { songId: string }) {
  const supabase = useSupabase()
  const { user } = useAuth()
  const singers = useFeatureTable<Singer>('singers', { order: ['name', { ascending: true }] })
  const keys = useFeatureTable<SingerSongKey>('singer_song_keys', { eq: { song_id: songId }, skip: singers.missing })
  const [singerId, setSingerId] = useState('')
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)

  if (singers.missing) return <section><Heading icon={Mic}>Singers&apos; keys</Heading><FeatureNotice feature="Singers and their keys" /></section>

  const mine = singers.rows.filter((s) => s.created_by === user?.id || s.user_id === user?.id)
  const save = async () => {
    if (!singerId || !key) return
    setSaving(true)
    const { error } = await supabase.from('singer_song_keys').upsert({ singer_id: singerId, song_id: songId, key }, { onConflict: 'singer_id,song_id' })
    setSaving(false)
    if (error) { toast.error('Could not save'); return }
    toast.success('Key saved'); setSingerId(''); setKey(''); keys.refetch()
  }

  return (
    <section aria-label="Singers' keys">
      <Heading icon={Mic}>Singers&apos; keys</Heading>
      {keys.rows.length > 0 ? (
        <ul className="surface divide-y divide-[var(--border)] mb-2">
          {keys.rows.map((k) => (
            <li key={k.id} className="flex items-center justify-between px-4 min-h-[44px] text-sm">
              <span className="text-[var(--fg)]">{singers.rows.find((s) => s.id === k.singer_id)?.name ?? 'Singer'}</span>
              <span className="font-semibold tabular text-[var(--success)]">{k.key}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--fg-subtle)] mb-2">No singer keys yet.</p>
      )}
      {mine.length > 0 ? (
        <div className="flex gap-2 items-end">
          <Select label="Singer" value={singerId} onChange={(e) => setSingerId(e.target.value)} options={[{ value: '', label: 'Choose…' }, ...mine.map((s) => ({ value: s.id, label: s.name }))]} />
          <Select label="Key" value={key} onChange={(e) => setKey(e.target.value)} options={[{ value: '', label: '—' }, ...MUSICAL_KEYS.map((k) => ({ value: k, label: k }))]} />
          <Button size="sm" className="shrink-0 h-11" onClick={save} disabled={!singerId || !key} loading={saving}>Save</Button>
        </div>
      ) : (
        <p className="text-xs text-[var(--fg-subtle)]">Add singers on the <Link href="/singers" className="text-[var(--accent-fg)] underline">Singers</Link> page to save their keys here.</p>
      )}
    </section>
  )
}

/* ─── Feedback from past services about this song ─── */
export function SongFeedback({ songId }: { songId: string }) {
  const fb = useFeatureTable<Feedback & { services?: { date: string; theme: string | null } | null }>('service_feedback', {
    eq: { song_id: songId }, order: ['created_at', { ascending: false }], select: '*, services(date, theme)',
  })
  if (fb.missing || fb.rows.length === 0) return null
  return (
    <section aria-label="Notes from past services">
      <Heading icon={MessageSquareText}>Notes from past services</Heading>
      <ul className="space-y-2">
        {fb.rows.slice(0, 5).map((f) => (
          <li key={f.id} className="surface p-3 text-sm space-y-1">
            <p className="text-xs text-[var(--fg-subtle)]">
              {f.services?.date ? new Date(f.services.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
              {f.author_name ? ` · ${f.author_name}` : ''}
            </p>
            {f.went_well && <p className="text-[var(--fg)]"><span className="text-[var(--success)]">Worked: </span>{f.went_well}</p>}
            {f.difficult && <p className="text-[var(--fg)]"><span className="text-[var(--warning)]">Difficult: </span>{f.difficult}</p>}
            {f.transition_notes && <p className="text-[var(--fg)]"><span className="text-[var(--accent-fg)]">Transitions: </span>{f.transition_notes}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
