import type { Metadata } from 'next'
import { SongsClient } from './SongsClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Songs',
}

export default function SongsPage() {
  return <SongsClient />
}
