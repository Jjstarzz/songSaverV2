'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BackHeader } from '@/components/layout/PageHeader'
import { SongForm } from '@/components/songs/SongForm'
import { Button } from '@/components/ui/Button'
import { useSong } from '@/hooks/useSongs'
import { Skeleton } from '@/components/ui/Skeleton'

interface Props {
  params: { id: string }
}

export default function EditSongPage({ params }: Props) {
  const router = useRouter()
  const { song, loading } = useSong(params.id)

  if (song && !loading) return <SongForm song={song} heading="Edit song" />

  return (
    <>
      <BackHeader title="Edit song">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </BackHeader>
      <div className="px-4 pt-6 max-w-2xl">
        {loading ? (
          <div className="space-y-4" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <p className="text-[var(--fg-muted)] text-center py-8">Song not found</p>
        )}
      </div>
    </>
  )
}
