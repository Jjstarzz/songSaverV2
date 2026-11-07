'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Music2, Search, ExternalLink, GripVertical, ArrowLeftRight, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import { Song, ServiceSong, MUSICAL_KEYS, formatKey } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { useSupabase } from '@/hooks/useSupabase'
import { useSongs } from '@/hooks/useSongs'
import { toast } from '@/components/ui/Toaster'
import { cn } from '@/lib/utils'

interface SetlistItem extends ServiceSong {
  songs: Song
}

interface SetlistManagerProps {
  serviceId: string
  items: SetlistItem[]
  onUpdate: () => void
  readOnly?: boolean
}

export function SetlistManager({ serviceId, items, onUpdate, readOnly = false }: SetlistManagerProps) {
  const supabase = useSupabase()
  const { songs } = useSongs()
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  // Local copy so reorders/removals show instantly; re-synced when the parent refetches
  const [list, setList] = useState<SetlistItem[]>(items)
  useEffect(() => { setList(items) }, [items])
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  // Second tap within 3s confirms a removal
  useEffect(() => {
    if (!confirmRemoveId) return
    const t = setTimeout(() => setConfirmRemoveId(null), 3000)
    return () => clearTimeout(t)
  }, [confirmRemoveId])
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null)
  const [showTransitions, setShowTransitions] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('songsaver-show-transitions') !== 'false' : true)
  const [transitionMap, setTransitionMap] = useState<Map<string, string | null>>(new Map())

  const songIdsKey = items.map((i) => i.song_id).join(',')

  useEffect(() => {
    if (!showTransitions || items.length < 2) { setTransitionMap(new Map()); return }
    let cancelled = false
    const songIds = songIdsKey.split(',')
    supabase
      .from('song_transitions')
      .select('from_song_id, to_song_id, notes')
      .or(`from_song_id.in.(${songIds.join(',')}),to_song_id.in.(${songIds.join(',')})`)
      .then(({ data }) => {
        if (cancelled) return
        const map = new Map<string, string | null>()
        for (const t of (data ?? []) as { from_song_id: string; to_song_id: string; notes: string | null }[]) {
          map.set([t.from_song_id, t.to_song_id].sort().join('|'), t.notes)
        }
        setTransitionMap(map)
      })
    return () => { cancelled = true }
  }, [supabase, showTransitions, songIdsKey, items.length])

  const availableSongs = songs.filter(
    (s) =>
      !list.some((item) => item.song_id === s.id) &&
      (search === '' ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.artist?.toLowerCase().includes(search.toLowerCase()))
  )

  const addSong = async (songId: string) => {
    setSaving(true)
    const { error } = await supabase.from('service_songs').insert({
      service_id: serviceId,
      song_id: songId,
      order_index: list.length,
      key_override: selectedKey || null,
    })
    if (error) {
      toast.error('Failed to add song')
    } else {
      const title = songs.find((s) => s.id === songId)?.title
      toast.success(title ? `Added "${title}"` : 'Song added to setlist')
      // Keep the panel open so several songs can be added in a row
      setSearch('')
      setSelectedKey('')
      onUpdate()
    }
    setSaving(false)
  }

  const removeSong = async (itemId: string, title: string) => {
    setConfirmRemoveId(null)
    setList((prev) => prev.filter((i) => i.id !== itemId))
    const { error } = await supabase.from('service_songs').delete().eq('id', itemId)
    if (error) toast.error('Failed to remove song')
    else toast.success(`Removed "${title}"`)
    onUpdate()
  }

  const updateKey = async (itemId: string, key: string | null) => {
    const { error } = await supabase.from('service_songs').update({ key_override: key }).eq('id', itemId)
    if (error) toast.error('Failed to update key')
    else { onUpdate(); setEditingKeyId(null) }
  }

  const moveSong = async (from: number, to: number) => {
    if (from === to || to < 0 || to >= list.length) return
    const reordered = [...list]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setList(reordered)
    // Only write rows whose position actually changed
    const changed = reordered
      .map((item, i) => ({ item, i }))
      .filter(({ item, i }) => item.order_index !== i)
    const results = await Promise.all(changed.map(({ item, i }) =>
      supabase.from('service_songs').update({ order_index: i }).eq('id', item.id)
    ))
    if (results.some((r) => r.error)) toast.error('Failed to save new order')
    onUpdate()
  }

  /**
   * Final index the dragged row would land at, from the pointer's position.
   * Rows don't move during the drag, so first find the gap the pointer is in
   * (0 = above the first row … length = below the last), then account for the
   * dragged row being taken out of the list when it moves down.
   */
  const targetIndexAt = (clientY: number, from: number) => {
    const rows = rowRefs.current.slice(0, list.length)
    let gap = list.length
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]?.getBoundingClientRect()
      if (r && clientY < r.top + r.height / 2) { gap = i; break }
    }
    return gap > from ? gap - 1 : gap
  }

  const onGripPointerDown = (e: React.PointerEvent, idx: number) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragIdx(idx)
    setDragOverIdx(idx)
  }
  const onGripPointerMove = (e: React.PointerEvent) => {
    if (dragIdx === null) return
    setDragOverIdx(targetIndexAt(e.clientY, dragIdx))
    // Nudge the page when dragging near the top/bottom edge
    const edge = 90
    if (e.clientY > window.innerHeight - edge) window.scrollBy(0, 12)
    else if (e.clientY < edge) window.scrollBy(0, -12)
  }
  const onGripPointerUp = () => {
    if (dragIdx !== null && dragOverIdx !== null) moveSong(dragIdx, dragOverIdx)
    setDragIdx(null)
    setDragOverIdx(null)
  }
  const onGripPointerCancel = () => { setDragIdx(null); setDragOverIdx(null) }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="section-label">
          Setlist {list.length > 0 && `(${list.length} songs)`}
        </p>
        <div className="flex items-center gap-3">
          {items.length > 1 && !adding && (
            <button
              onClick={() => {
                const next = !showTransitions
                setShowTransitions(next)
                localStorage.setItem('songsaver-show-transitions', String(next))
              }}
              title="Show transition notes between songs"
              className={cn(
                'text-xs transition-colors flex items-center gap-1 py-3 -my-3 px-2 -mx-2',
                showTransitions ? 'text-accent-400 hover:text-accent-300' : 'text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]'
              )}
            >
              <ArrowLeftRight className="w-3 h-3" /> Transitions
            </button>
          )}
          {!readOnly && !adding && (
            <button
              onClick={() => setAdding(true)}
              className="text-xs text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Song
            </button>
          )}
        </div>
      </div>

      {/* Song list */}
      {list.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Music2 className="w-8 h-8 text-[var(--fg-subtle)] mx-auto mb-2" />
          <p className="text-sm text-[var(--fg-muted)]">
            {readOnly ? 'No songs in this setlist' : 'No songs yet — add your first song'}
          </p>
          {!readOnly && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setAdding(true)}>
              Add first song
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((item, idx) => {
            const displayKey = item.key_override
              ? formatKey(item.key_override, item.songs.mode)
              : formatKey(item.songs.preferred_key || item.songs.default_key, item.songs.mode)
            const isEditingKey = editingKeyId === item.id
            const nextItem = list[idx + 1]
            const transitionNote = nextItem
              ? transitionMap.get([item.song_id, nextItem.song_id].sort().join('|'))
              : undefined
            const hasTransition = showTransitions && nextItem && transitionMap.has([item.song_id, nextItem.song_id].sort().join('|'))

            return (
              <div key={item.id}>
                <div
                  ref={(el) => { rowRefs.current[idx] = el }}
                  className="glass-card transition-opacity overflow-hidden"
                  style={{ opacity: dragIdx === idx ? 0.4 : 1, outline: dragOverIdx === idx && dragIdx !== null && dragIdx !== idx ? '2px solid rgba(124,58,237,0.6)' : 'none', borderRadius: 12 }}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-3 p-3">
                    {/* Order number */}
                    <span className="w-5 text-center text-xs font-bold text-[var(--fg-subtle)] shrink-0">
                      {idx + 1}
                    </span>

                    {/* Song info — tappable link */}
                    <Link href={`/songs/${item.song_id}?serviceId=${serviceId}`} className="flex-1 min-w-0 group/link">
                      <p className="text-sm font-medium text-[var(--fg)] truncate group-hover/link:text-accent-400 transition-colors">
                        {item.songs.title}
                      </p>
                      {item.songs.artist && (
                        <p className="text-xs text-[var(--fg-muted)] truncate">{item.songs.artist}</p>
                      )}
                    </Link>

                    {/* Key badge — tappable to edit */}
                    {!readOnly ? (
                      <button
                        onClick={() => setEditingKeyId(isEditingKey ? null : item.id)}
                        className={cn(
                          'text-xs font-medium shrink-0 px-2 py-1 rounded-lg border transition-all',
                          isEditingKey
                            ? 'bg-accent-600 border-accent-500 text-white'
                            : item.key_override
                              ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
                              : displayKey
                                ? 'text-[var(--fg-muted)] border-[var(--border)] bg-[var(--bg-input)] hover:text-white'
                                : 'text-[var(--fg-subtle)] border-[var(--border)] bg-[var(--bg-input)] hover:text-white'
                        )}
                      >
                        {displayKey || 'Key'}
                      </button>
                    ) : (
                      displayKey && (
                        <span className="text-xs font-medium text-[var(--fg-muted)] shrink-0">{displayKey}</span>
                      )
                    )}

                    {/* Controls */}
                    {!readOnly && (
                      <>
                        {confirmRemoveId === item.id ? (
                          <button
                            onClick={() => removeSong(item.id, item.songs.title)}
                            className="shrink-0 h-9 px-3 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmRemoveId(item.id)}
                            aria-label={`Remove ${item.songs.title}`}
                            className="w-9 h-9 -mr-1 flex items-center justify-center rounded-lg text-red-400/50 hover:text-red-400 transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {list.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Reorder ${item.songs.title} (drag, or use arrow keys)`}
                            onPointerDown={(e) => onGripPointerDown(e, idx)}
                            onPointerMove={onGripPointerMove}
                            onPointerUp={onGripPointerUp}
                            onPointerCancel={onGripPointerCancel}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp') { e.preventDefault(); moveSong(idx, idx - 1) }
                              if (e.key === 'ArrowDown') { e.preventDefault(); moveSong(idx, idx + 1) }
                            }}
                            className="w-9 h-11 -mr-2 flex items-center justify-center shrink-0 text-[var(--fg-subtle)] cursor-grab active:cursor-grabbing"
                            style={{ touchAction: 'none' }}
                          >
                            <GripVertical className="w-5 h-5" />
                          </button>
                        )}
                      </>
                    )}

                    {readOnly && (
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--fg-subtle)] shrink-0" />
                    )}
                  </div>

                  {/* Inline key picker */}
                  {isEditingKey && (
                    <div className="px-3 pb-3 animate-fade-in">
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                        <button
                          onClick={() => updateKey(item.id, null)}
                          className={cn(
                            'shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                            !item.key_override
                              ? 'bg-accent-600 border-accent-500 text-white'
                              : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:text-white'
                          )}
                        >
                          Original
                        </button>
                        {MUSICAL_KEYS.map((k) => (
                          <button
                            key={k}
                            onClick={() => updateKey(item.id, k)}
                            className={cn(
                              'shrink-0 w-8 py-1 rounded-lg text-xs font-medium border transition-all text-center',
                              item.key_override === k
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)] hover:text-white'
                            )}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {hasTransition && (
                  <div className="flex items-center gap-3 px-3 py-0.5">
                    <div className="w-5 flex justify-center shrink-0">
                      <ArrowDown className="w-3.5 h-3.5 text-accent-400/70" />
                    </div>
                    {transitionNote && (
                      <p className="text-xs italic text-[var(--fg-subtle)] truncate">{transitionNote}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add song panel */}
      {adding && (
        <div className="glass-card p-3 space-y-3 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--fg-subtle)] pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search songs..."
              className="input-base pl-9 text-sm py-2"
              autoFocus
            />
          </div>

          {/* Key override */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              onClick={() => setSelectedKey('')}
              className={cn(
                'shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                !selectedKey
                  ? 'bg-accent-600 border-accent-500 text-white'
                  : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)]'
              )}
            >
              Original
            </button>
            {MUSICAL_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setSelectedKey(k === selectedKey ? '' : k)}
                className={cn(
                  'shrink-0 w-8 py-1 rounded-lg text-xs font-medium border transition-all text-center',
                  selectedKey === k
                    ? 'bg-accent-600 border-accent-500 text-white'
                    : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--fg-muted)]'
                )}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1.5 no-scrollbar">
            {availableSongs.length === 0 ? (
              <p className="text-xs text-[var(--fg-subtle)] text-center py-3">
                {search ? 'No songs match' : 'All songs already added'}
              </p>
            ) : (
              availableSongs.slice(0, 25).map((s) => (
                <button
                  key={s.id}
                  onClick={() => addSong(s.id)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border)] transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-accent-500/10 flex items-center justify-center shrink-0">
                    <Music2 className="w-3.5 h-3.5 text-accent-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--fg)] truncate">{s.title}</p>
                    {s.artist && <p className="text-xs text-[var(--fg-muted)] truncate">{s.artist}</p>}
                  </div>
                  {(s.preferred_key || s.default_key) && (
                    <span className="text-xs text-accent-400 font-medium shrink-0">
                      {formatKey(s.preferred_key || s.default_key, s.mode)}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={() => { setAdding(false); setSearch('') }}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
