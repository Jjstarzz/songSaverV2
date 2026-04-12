'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Plus, CalendarDays, Clock } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ServiceCard } from '@/components/services/ServiceCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ServiceCardSkeleton } from '@/components/ui/Skeleton'
import { useServices } from '@/hooks/useServices'

export function ServicesClient() {
  const { services, loading } = useServices()

  const today = new Date().toISOString().split('T')[0]

  const { upcoming, past } = useMemo(() => {
    const upcoming = services
      .filter((s) => s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date)) // soonest first

    const past = services
      .filter((s) => s.date < today)
      .sort((a, b) => b.date.localeCompare(a.date)) // most recent first

    return { upcoming, past }
  }, [services, today])

  return (
    <div className="px-4">
      <PageHeader
        title="Services"
        subtitle={loading ? '' : `${services.length} total`}
        action={
          <Link href="/services/new">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              New
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-7 h-7" />}
          title="No services yet"
          description="Plan your first worship service and build your setlist"
          action={
            <Link href="/services/new">
              <Button>
                <Plus className="w-4 h-4" />
                Create Service
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <p className="section-label flex items-center gap-1.5 mb-3">
                <CalendarDays className="w-3.5 h-3.5" />
                Upcoming
              </p>
              <div className="space-y-2.5">
                {upcoming.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              <p className="section-label flex items-center gap-1.5 mb-3">
                <Clock className="w-3.5 h-3.5" />
                Past Services
              </p>
              <div className="space-y-2.5">
                {past.map((service) => (
                  <ServiceCard key={service.id} service={service} past />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
