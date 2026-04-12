import type { Metadata } from 'next'
import { ServicesClient } from './ServicesClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Services' }

export default function ServicesPage() {
  return <ServicesClient />
}
