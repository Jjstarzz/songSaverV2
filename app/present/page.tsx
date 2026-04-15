import { Suspense } from 'react'
import { PresentDisplay } from './PresentDisplay'

export const dynamic = 'force-dynamic'

export default function PresentPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <PresentDisplay />
    </Suspense>
  )
}
