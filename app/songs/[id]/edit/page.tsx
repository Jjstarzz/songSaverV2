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

  return (
    <>
      <BackHeader title="Edit Song">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </BackHeader>
      <div className="px-4 pt-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : song ? (
          <SongForm song={song} />
        ) : (
          <p className="text-white/50 text-center py-8">Song not found</p>
        )}
      </div>
    </>
  )
}
