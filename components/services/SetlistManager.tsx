'use client'

import { useState } from 'react'
import { Plus, Trash2, Music2, Search, ExternalLink, GripVertical } from 'lucide-react'
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
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null)

  const availableSongs = songs.filter(
    (s) =>
      !items.some((item) => item.song_id === s.id) &&
      (search === '' ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.artist?.toLowerCase().includes(search.toLowerCase()))
  )

  const addSong = async (songId: string) => {
    setSaving(true)
    const { error } = await supabase.from('service_songs').insert({
      service_id: serviceId,
      song_id: songId,
      order_index: items.length,
      key_override: selectedKey || null,
    })
    if (error) {
      toast.error('Failed to add song')
    } else {
      toast.success('Song added to setlist')
      setSearch('')
      setSelectedKey('')
      setAdding(false)
      onUpdate()
    }
    setSaving(false)
  }

  const removeSong = async (itemId: string, title: string) => {
    const { error } = await supabase.from('service_songs').delete().eq('id', itemId)
    if (error) toast.error('Failed to remove song')
    else { toast.success(`Removed "${title}"`); onUpdate() }
  }

  const updateKey = async (itemId: string, key: string | null) => {
    const { error } = await supabase.from('service_songs').update({ key_override: key }).eq('id', itemId)
    if (error) toast.error('Failed to update key')
    else { onUpdate(); setEditingKeyId(null) }
  }

  const handleDrop = async (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null); setDragOverIdx(null); return
    }
    const reordered = [...items]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(dropIdx, 0, moved)
    setDragIdx(null); setDragOverIdx(null)
    await Promise.all(reordered.map((item, i) =>
      supabase.from('service_songs').update({ order_index: i }).eq('id', item.id)
    ))
    onUpdate()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="section-label">
          Setlist {items.length > 0 && `(${items.length} songs)`}
        </p>
        {!readOnly && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Song
          </button>
        )}
      </div>

      {/* Song list */}
      {items.length === 0 ? (
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
          {items.map((item, idx) => {
            const displayKey = item.key_override
              ? formatKey(item.key_override, item.songs.mode)
              : formatKey(item.songs.preferred_key || item.songs.default_key, item.songs.mode)
            const isEditingKey = editingKeyId === item.id

            return (
              <div
                key={item.id}
                className="glass-card transition-opacity overflow-hidden"
                style={{ opacity: dragIdx === idx ? 0.4 : 1, outline: dragOverIdx === idx && dragIdx !== idx ? '2px solid rgba(124,58,237,0.6)' : 'none', borderRadius: 12 }}
                draggable={!readOnly && !isEditingKey}
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx) }}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                onDrop={() => handleDrop(idx)}
              >
                {/* Main row */}
                <div className="flex items-center gap-3 p-3">
                  {/* Order number */}
                  <span className="w-5 text-center text-xs font-bold text-[var(--fg-subtle)] shrink-0">
                    {idx + 1}
                  </span>

                  {/* Song info — tappable link */}
                  <Link href={`/songs/${item.song_id}`} className="flex-1 min-w-0 group/link">
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
                      <GripVertical className="w-4 h-4 text-[var(--fg-subtle)] shrink-0 cursor-grab active:cursor-grabbing" />
                      <button
                        onClick={() => removeSong(item.id, item.songs.title)}
                        className="text-red-400/40 hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
