'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { SongList } from '@/components/songs/SongList'
import { Button } from '@/components/ui/Button'
import { useSongs } from '@/hooks/useSongs'
import { useUserSongKeys } from '@/hooks/useUserSongKeys'

export function SongsClient() {
  const { songs, loading } = useSongs()
  const userKeys = useUserSongKeys()

  return (
    <div className="px-4">
      <PageHeader
        title="Song Library"
        subtitle={loading ? '' : `${songs.length} songs`}
        action={
          <Link href="/songs/new">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </Link>
        }
      />
      <SongList songs={songs} loading={loading} userKeys={userKeys} />
    </div>
  )
}
