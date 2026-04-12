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

  return (
    <>
      <BackHeader title="Edit Service">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </BackHeader>
      <div className="px-4 pt-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : service ? (
          <ServiceForm service={service} />
        ) : (
          <p className="text-white/50 text-center py-8">Service not found</p>
        )}
      </div>
    </>
  )
}
