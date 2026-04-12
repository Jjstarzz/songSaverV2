'use client'

import { useState } from 'react'
import { ArrowLeftRight, Plus, X, Music2, Search } from 'lucide-react'
import Link from 'next/link'
import { useSongTransitions } from '@/hooks/useSongTransitions'
import { useSongs } from '@/hooks/useSongs'
import { useAuth } from '@/hooks/useAuth'
import { formatKey } from '@/types/database'
import { toast } from '@/components/ui/Toaster'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface SongTransitionsProps {
  songId: string
  songTitle: string
}

export function SongTransitions({ songId, songTitle }: SongTransitionsProps) {
  const { user } = useAuth()
  const { transitions, loading, addTransition, removeTransition } = useSongTransitions(songId)
  const { songs } = useSongs()

  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // IDs already linked (either direction)
  const linkedIds = new Set(transitions.map((t) => t.other_song?.id).filter(Boolean))

  const availableSongs = songs.filter(
    (s) =>
      s.id !== songId &&
      !linkedIds.has(s.id) &&
      (search === '' ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.artist?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleAdd = async (otherSongId: string) => {
    setSaving(true)
    const { error } = await addTransition(otherSongId)
    if (error) toast.error('Failed to add transition')
    else { toast.success('Transition added'); setAdding(false); setSearch('') }
    setSaving(false)
  }

  const handleRemove = async (transitionId: string) => {
    const { error } = await removeTransition(transitionId)
    if (error) toast.error('Failed to remove')
    else toast.success('Transition removed')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="section-label flex items-center gap-1.5">
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Transitions
        </p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {/* Existing transitions */}
      {!loading && transitions.length > 0 && (
        <div className="space-y-2">
          {transitions.map((t) => {
            const other = t.other_song
            if (!other) return null
            return (
              <div key={t.id} className="glass-card flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center shrink-0">
                  <Music2 className="w-4 h-4 text-accent-400" />
                </div>
                <Link href={`/songs/${other.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--fg)] truncate">{other.title}</p>
                  {other.artist && (
                    <p className="text-xs text-[var(--fg-muted)] truncate">{other.artist}</p>
                  )}
                </Link>
                {(other.preferred_key || other.default_key) && (
                  <span className="text-xs text-accent-400 font-medium shrink-0">
                    {formatKey(other.preferred_key || other.default_key, other.mode)}
                  </span>
                )}
                {user && t.created_by === user.id && (
                  <button
                    onClick={() => handleRemove(t.id)}
                    className="text-[var(--fg-subtle)] hover:text-red-400 transition-colors shrink-0"
                    aria-label="Remove transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && transitions.length === 0 && !adding && (
        <p className="text-xs text-[var(--fg-subtle)] py-1">
          No transitions yet. Add songs that flow well with {songTitle}.
        </p>
      )}

      {/* Add transition picker */}
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

          <div className="max-h-52 overflow-y-auto space-y-1.5 no-scrollbar">
            {availableSongs.length === 0 ? (
              <p className="text-xs text-[var(--fg-subtle)] text-center py-3">
                {search ? 'No songs match' : 'All songs already linked'}
              </p>
            ) : (
              availableSongs.slice(0, 20).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleAdd(s.id)}
                  disabled={saving}
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all',
                    'bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border)]'
                  )}
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
