'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BackHeader } from '@/components/layout/PageHeader'
import { ServiceForm } from '@/components/services/ServiceForm'
import { Button } from '@/components/ui/Button'
import { useService } from '@/hooks/useServices'
import { Skeleton } from '@/components/ui/Skeleton'

interface Props { params: { id: string } }

export default function EditServicePage({ params }: Props) {
  const router = useRouter()
  const { service, loading } = useService(params.id)

  if (service && !loading) return <ServiceForm service={service} heading="Edit service" />

  return (
    <>
      <BackHeader title="Edit service">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </BackHeader>
      <div className="px-4 pt-6 max-w-2xl">
        {loading ? (
          <div className="space-y-4" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <p className="text-[var(--fg-muted)] text-center py-8">Service not found</p>
        )}
      </div>
    </>
  )
}
