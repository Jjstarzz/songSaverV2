'use client'

export const dynamic = 'force-dynamic'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BackHeader } from '@/components/layout/PageHeader'
import { ServiceForm } from '@/components/services/ServiceForm'
import { Button } from '@/components/ui/Button'

export default function NewServicePage() {
  const router = useRouter()
  return (
    <>
      <BackHeader title="New Service">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </BackHeader>
      <div className="px-4 pt-6">
        <ServiceForm />
      </div>
    </>
  )
}
