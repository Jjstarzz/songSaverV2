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

            return (
              <div
                key={item.id}
                className="glass-card flex items-center gap-3 p-3 transition-opacity"
                style={{ opacity: dragIdx === idx ? 0.4 : 1, outline: dragOverIdx === idx && dragIdx !== idx ? '2px solid rgba(124,58,237,0.6)' : 'none', borderRadius: 12 }}
                draggable={!readOnly}
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx) }}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                onDrop={() => handleDrop(idx)}
              >
                {/* Order number */}
                <span className="w-5 text-center text-xs font-bold text-[var(--fg-subtle)] shrink-0">
                  {idx + 1}
                </span>

                {/* Song info — tappable link */}
                <Link
                  href={`/songs/${item.song_id}`}
                  className="flex-1 min-w-0 group/link"
                >
                  <p className="text-sm font-medium text-[var(--fg)] truncate group-hover/link:text-accent-400 transition-colors">
                    {item.songs.title}
                  </p>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {displayKey || (item.songs.artist ?? 'No key set')}
                    {displayKey && item.songs.artist && (
                      <span className="text-[var(--fg-subtle)]"> · {item.songs.artist}</span>
                    )}
                  </p>
                </Link>

                {/* Key override badge */}
                {item.key_override && (
                  <span className="text-xs font-medium text-emerald-400 shrink-0">
                    {formatKey(item.key_override, item.songs.mode)}
                  </span>
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

                {/* Read-only: show link icon */}
                {readOnly && (
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--fg-subtle)] shrink-0" />
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
