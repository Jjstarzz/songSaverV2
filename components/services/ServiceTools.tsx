'use client'

import { useCallback, useEffect, useState } from 'react'
import { CircleCheck as CloudCheck, CloudDownload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/Toaster'
import { useSupabase } from '@/hooks/useSupabase'
import { saveOfflineService, saveOfflineSongs, countOfflineSongs, getOfflineService } from '@/lib/offlineDB'
import { isMissingTable, MIGRATION_HINT, type TemplateSlot } from '@/lib/features'
import type { ServiceWithSongs } from '@/types/database'

type SetlistRow = ServiceWithSongs['service_songs'][number]

/* ─── Offline service pack ─── */
export function useOfflinePack(service: ServiceWithSongs | null) {
  const [ready, setReady] = useState<{ songs: number; total: number; savedAt: number | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const ids = (service?.service_songs ?? []).map((ss) => ss.song_id)

  const check = useCallback(async () => {
    if (!service) return
    try {
      const [n, pack] = await Promise.all([countOfflineSongs(ids), getOfflineService(service.id)])
      setReady({ songs: n, total: ids.length, savedAt: pack?.savedAt ?? null })
    } catch { setReady(null) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.id, ids.join(',')])

  useEffect(() => { check() }, [check])

  const save = async () => {
    if (!service) return
    setSaving(true)
    try {
      await saveOfflineSongs((service.service_songs ?? []).filter((ss) => ss.songs).map((ss) => {
        const s = ss.songs as unknown as Record<string, any>
        return {
          id: s.id, title: s.title, artist: s.artist ?? null, default_key: s.default_key ?? null, preferred_key: s.preferred_key ?? null,
          mode: s.mode ?? null, bpm: s.bpm ?? null, time_signature: s.time_signature ?? null, tags: s.tags ?? [], notes: s.notes ?? null,
          youtube_url: s.youtube_url ?? null, spotify_url: s.spotify_url ?? null, created_at: s.created_at, created_by: s.created_by,
          song_lyrics: (s.song_lyrics ?? []).map((l: any) => ({ id: l.id, language: l.language, lyrics: l.lyrics, is_default: l.is_default })),
        }
      }))
      await saveOfflineService(service as unknown as { id: string } & Record<string, unknown>)
      toast.success('Service saved for offline use')
      await check()
    } catch {
      toast.error('Could not save for offline use')
    }
    setSaving(false)
  }

  const isReady = !!ready && !!ready.savedAt && ready.songs >= ready.total
  return { ready, isReady, saving, save }
}

export function OfflinePackStatus({ pack }: { pack: ReturnType<typeof useOfflinePack> }) {
  const { ready, isReady, saving, save } = pack
  if (!ready) return null
  return (
    <div className="flex items-center gap-2 text-sm" role="status">
      {isReady ? (
        <span className="inline-flex items-center gap-1.5 text-[var(--success)]">
          <CloudCheck aria-hidden className="w-4 h-4" /> Ready offline · {ready.songs} of {ready.total} songs
        </span>
      ) : (
        <>
          <span className="text-[var(--fg-muted)]">
            {ready.total === 0 ? 'No songs to save yet' : `${ready.songs} of ${ready.total} songs available offline`}
          </span>
          {ready.total > 0 && (
            <Button size="sm" variant="secondary" onClick={save} loading={saving}>
              <CloudDownload aria-hidden className="w-4 h-4" /> Save for offline
            </Button>
          )}
        </>
      )}
    </div>
  )
}

/* ─── Save the setlist as a template ─── */
export function SaveTemplateModal({ open, onClose, service, rows }: {
  open: boolean; onClose: () => void; service: ServiceWithSongs; rows: SetlistRow[]
}) {
  const supabase = useSupabase()
  const [name, setName] = useState('')
  const [slots, setSlots] = useState<TemplateSlot[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(service.theme ? `${service.theme} template` : '')
    setSlots(rows.map((r, i) => ({
      label: (r as SetlistRow & { slot_label?: string | null }).slot_label ?? (i === 0 ? 'Opening' : i === rows.length - 1 ? 'Closing' : 'Worship'),
      song_id: r.song_id,
      song_title: r.songs?.title ?? null,
      key: r.key_override ?? null,
    })))
  }, [open, service.theme, rows])

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('service_templates').insert({
      name: name.trim(), type: service.type, theme: null, notes: service.notes, slots,
    })
    setSaving(false)
    if (error) { toast.error(isMissingTable(error) ? MIGRATION_HINT : 'Could not save template'); return }
    toast.success(`Template “${name.trim()}” saved`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Save as template" variant="sheet">
      <div className="space-y-4">
        <Input label="Template name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. English Sunday Worship" />
        <div>
          <p className="text-sm font-medium text-[var(--fg-muted)] mb-2">Slots</p>
          <p className="text-xs text-[var(--fg-subtle)] mb-2">Name each slot. Songs are kept as suggestions — you can swap them when you plan a service.</p>
          <ol className="space-y-2">
            {slots.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span aria-hidden className="w-5 text-right text-sm tabular text-[var(--fg-subtle)]">{i + 1}</span>
                <input
                  value={s.label}
                  onChange={(e) => setSlots((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  aria-label={`Slot ${i + 1} label`}
                  className="input-base w-36 shrink-0"
                />
                <span className="text-sm text-[var(--fg-muted)] truncate">{s.song_title}{s.key ? ` · ${s.key}` : ''}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={save} loading={saving} disabled={!name.trim()}>Save template</Button>
        </div>
      </div>
    </Modal>
  )
}
