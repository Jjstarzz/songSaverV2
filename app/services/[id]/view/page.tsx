import { Suspense } from 'react'
import { PublicServiceView } from './PublicServiceView'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export default function PublicServicePage({ params }: Props) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b]" />}>
      <PublicServiceView id={params.id} />
    </Suspense>
  )
}
