import { SongDetailClient } from './SongDetailClient'

interface Props {
  params: { id: string }
}

export default function SongDetailPage({ params }: Props) {
  return <SongDetailClient id={params.id} />
}
