'use client'

import { useState } from 'react'
import { Check, MessageSquareText, Plus, Trash2, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { FeatureNotice } from '@/components/ui/FeatureNotice'
import { toast } from '@/components/ui/Toaster'
import { useFeatureTable } from '@/hooks/useFeatureTable'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import { TEAM_ROLES, type Assignment, type AssignmentStatus, type Feedback, type Singer } from '@/lib/features'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<AssignmentStatus, string> = { pending: 'Awaiting reply', confirmed: 'Available', declined: "Can't make it" }

function SectionTitle({ icon: Icon, children, action }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <h2 className="text-base font-semibold text-[var(--fg)] flex items-center gap-2"><Icon aria-hidden className="w-4 h-4 text-[var(--fg-subtle)]" /> {children}</h2>
      {action}
    </div>
  )
}

/* ─── Team roles & assignments ─── */
export function ServiceTeam({ serviceId, canEdit }: { serviceId: string; canEdit: boolean }) {
  const supabase = useSupabase()
  const { user } = useAuth()
  const team = useFeatureTable<Assignment>('service_assignments', { eq: { service_id: serviceId }, order: ['created_at', { ascending: true }] })
  const singers = useFeatureTable<Singer>('singers', { order: ['name', { ascending: true }], skip: team.missing })
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ role: 'Vocalist', person: '', singerId: '', isMe: false, tasks: '' })

  if (team.missing) return <section><SectionTitle icon={Users}>Team</SectionTitle><FeatureNotice feature="Team roles and assignments" /></section>

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const singer = singers.rows.find((s) => s.id === f.singerId)
    const person = f.person.trim() || singer?.name || ''
    if (!person) { toast.error('Enter a name'); return }
    setSaving(true)
    const { error } = await supabase.from('service_assignments').insert({
      service_id: serviceId, role: f.role, person_name: person, singer_id: f.singerId || null,
      user_id: f.isMe ? user?.id : null, tasks: f.tasks.trim() || null, status: f.isMe ? 'confirmed' : 'pending',
    })
    setSaving(false)
    if (error) { toast.error('Could not add to the team'); return }
    toast.success(`${person} added as ${f.role.toLowerCase()}`)
    setF({ role: f.role, person: '', singerId: '', isMe: false, tasks: '' })
    setAdding(false); team.refetch()
  }

  const setStatus = async (a: Assignment, status: AssignmentStatus) => {
    const { error } = await supabase.from('service_assignments').update({ status }).eq('id', a.id)
    if (error) toast.error('Could not update'); else team.refetch()
  }
  const remove = async (a: Assignment) => {
    const { error } = await supabase.from('service_assignments').delete().eq('id', a.id)
    if (error) toast.error('Could not remove'); else team.refetch()
  }

  const confirmed = team.rows.filter((a) => a.status === 'confirmed').length

  return (
    <section aria-label="Team">
      <SectionTitle icon={Users} action={canEdit && !adding && (
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus aria-hidden className="w-4 h-4" /> Add person</Button>
      )}>
        Team {team.rows.length > 0 && <span className="text-sm font-normal text-[var(--fg-subtle)]">· {confirmed} of {team.rows.length} available</span>}
      </SectionTitle>

      {team.rows.length === 0 && !adding && (
        <p className="text-sm text-[var(--fg-subtle)]">{canEdit ? 'Assign a worship leader, vocalists and musicians, and note what each person should prepare.' : 'No one assigned yet.'}</p>
      )}

      <ul className="space-y-2">
        {team.rows.map((a) => {
          const isMine = !!user && a.user_id === user.id
          const canRespond = canEdit || isMine
          return (
            <li key={a.id} className="surface p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[var(--fg)]">{a.person_name}{isMine && <span className="text-[var(--fg-subtle)] font-normal"> (you)</span>}</p>
                  <p className="text-sm text-[var(--fg-muted)]">{a.role}</p>
                  {a.tasks && <p className="text-sm text-[var(--fg)] mt-1 whitespace-pre-wrap"><span className="text-[var(--fg-subtle)]">Prepare: </span>{a.tasks}</p>}
                </div>
                <span className={cn('chip shrink-0', a.status === 'confirmed' && 'chip-success', a.status === 'declined' && 'chip-warning')}>{STATUS_LABEL[a.status]}</span>
              </div>
              {canRespond && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <button type="button" onClick={() => setStatus(a, 'confirmed')} aria-pressed={a.status === 'confirmed'}
                    className={cn('h-9 px-3 rounded-lg border text-sm flex items-center gap-1', a.status === 'confirmed' ? 'border-[var(--success)] text-[var(--success)]' : 'border-[var(--border-strong)] text-[var(--fg-muted)]')}>
                    <Check aria-hidden className="w-4 h-4" /> Available
                  </button>
                  <button type="button" onClick={() => setStatus(a, 'declined')} aria-pressed={a.status === 'declined'}
                    className={cn('h-9 px-3 rounded-lg border text-sm flex items-center gap-1', a.status === 'declined' ? 'border-[var(--warning)] text-[var(--warning)]' : 'border-[var(--border-strong)] text-[var(--fg-muted)]')}>
                    <X aria-hidden className="w-4 h-4" /> Can&apos;t make it
                  </button>
                  {canEdit && (
                    <button type="button" onClick={() => remove(a)} aria-label={`Remove ${a.person_name} from the team`} className="h-9 w-9 ml-auto flex items-center justify-center rounded-lg text-[var(--fg-subtle)] hover:text-[var(--danger)]">
                      <Trash2 aria-hidden className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {adding && (
        <form onSubmit={add} className="surface p-3 mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} options={TEAM_ROLES.map((r) => ({ value: r, label: r }))} />
            {singers.rows.length > 0 ? (
              <Select label="Singer (optional)" value={f.singerId} onChange={(e) => setF({ ...f, singerId: e.target.value })}
                options={[{ value: '', label: '—' }, ...singers.rows.map((s) => ({ value: s.id, label: s.name }))]} />
            ) : <span />}
          </div>
          <Input label="Name" value={f.person} onChange={(e) => setF({ ...f, person: e.target.value })} placeholder={f.singerId ? 'Uses the singer’s name if empty' : 'e.g. Joel'} />
          <label className="flex items-center gap-2 text-sm text-[var(--fg)] min-h-[44px]">
            <input type="checkbox" checked={f.isMe} onChange={(e) => setF({ ...f, isMe: e.target.checked })} className="w-4 h-4 accent-[#236653]" />
            This is me (I can confirm my own availability)
          </label>
          <Textarea label="What to prepare (optional)" value={f.tasks} onChange={(e) => setF({ ...f, tasks: e.target.value })} rows={2} className="min-h-[72px]" placeholder="e.g. Lead songs 2 and 4; harmony on the chorus" />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={saving}>Add to team</Button>
          </div>
        </form>
      )}
    </section>
  )
}

/* ─── Feedback after the service ─── */
export function ServiceFeedbackSection({ serviceId, songs, isPast }: { serviceId: string; songs: { id: string; title: string }[]; isPast: boolean }) {
  const supabase = useSupabase()
  const { user } = useAuth()
  const fb = useFeatureTable<Feedback>('service_feedback', { eq: { service_id: serviceId }, order: ['created_at', { ascending: false }] })
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ songId: '', wentWell: '', difficult: '', transitions: '' })

  if (fb.missing) return <section><SectionTitle icon={MessageSquareText}>Feedback</SectionTitle><FeatureNotice feature="Service feedback" /></section>

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.wentWell.trim() && !f.difficult.trim() && !f.transitions.trim()) { toast.error('Write at least one note'); return }
    setSaving(true)
    const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', user?.id ?? '').maybeSingle()
    const { error } = await supabase.from('service_feedback').insert({
      service_id: serviceId, song_id: f.songId || null, author_name: prof?.display_name ?? null,
      went_well: f.wentWell.trim() || null, difficult: f.difficult.trim() || null, transition_notes: f.transitions.trim() || null,
    })
    setSaving(false)
    if (error) { toast.error('Could not save feedback'); return }
    toast.success('Thanks — feedback saved for the next leader')
    setF({ songId: '', wentWell: '', difficult: '', transitions: '' }); setOpen(false); fb.refetch()
  }
  const remove = async (x: Feedback) => {
    const { error } = await supabase.from('service_feedback').delete().eq('id', x.id)
    if (error) toast.error('Could not delete'); else fb.refetch()
  }
  const songTitle = (id: string | null) => songs.find((s) => s.id === id)?.title

  return (
    <section aria-label="Feedback">
      <SectionTitle icon={MessageSquareText} action={!open && (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Plus aria-hidden className="w-4 h-4" /> Add feedback</Button>
      )}>Feedback</SectionTitle>
      {fb.rows.length === 0 && !open && (
        <p className="text-sm text-[var(--fg-subtle)]">
          {isPast ? 'How did it go? Note what worked, difficult keys and transition changes so the next leader benefits.' : 'After the service, record what worked and what to change.'}
        </p>
      )}
      <ul className="space-y-2">
        {fb.rows.map((x) => (
          <li key={x.id} className="surface p-3 text-sm space-y-1">
            <div className="flex items-start gap-2">
              <p className="flex-1 text-xs text-[var(--fg-subtle)]">
                {x.author_name ?? 'Someone'} · {new Date(x.created_at).toLocaleDateString()}
                {x.song_id && songTitle(x.song_id) ? ` · about “${songTitle(x.song_id)}”` : ''}
              </p>
              {x.author_id === user?.id && (
                <button type="button" onClick={() => remove(x)} aria-label="Delete this feedback" className="w-9 h-9 -m-1.5 flex items-center justify-center rounded-lg text-[var(--fg-subtle)] hover:text-[var(--danger)]">
                  <Trash2 aria-hidden className="w-4 h-4" />
                </button>
              )}
            </div>
            {x.went_well && <p className="text-[var(--fg)]"><span className="text-[var(--success)]">Worked: </span>{x.went_well}</p>}
            {x.difficult && <p className="text-[var(--fg)]"><span className="text-[var(--warning)]">Difficult: </span>{x.difficult}</p>}
            {x.transition_notes && <p className="text-[var(--fg)]"><span className="text-[var(--accent-fg)]">Transitions: </span>{x.transition_notes}</p>}
          </li>
        ))}
      </ul>
      {open && (
        <form onSubmit={save} className="surface p-3 mt-2 space-y-3">
          {songs.length > 0 && (
            <Select label="About a particular song? (optional)" value={f.songId} onChange={(e) => setF({ ...f, songId: e.target.value })}
              options={[{ value: '', label: 'The whole service' }, ...songs.map((s) => ({ value: s.id, label: s.title }))]} />
          )}
          <Textarea label="What worked" value={f.wentWell} onChange={(e) => setF({ ...f, wentWell: e.target.value })} rows={2} className="min-h-[72px]" />
          <Textarea label="Difficult keys or parts" value={f.difficult} onChange={(e) => setF({ ...f, difficult: e.target.value })} rows={2} className="min-h-[72px]" placeholder="e.g. Chorus too high in B — try A next time" />
          <Textarea label="Transition changes" value={f.transitions} onChange={(e) => setF({ ...f, transitions: e.target.value })} rows={2} className="min-h-[72px]" />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={saving}>Save feedback</Button>
          </div>
          {f.songId && <p className="text-xs text-[var(--fg-subtle)]">Notes about a song also appear on that song&apos;s page.</p>}
        </form>
      )}
    </section>
  )
}
