'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Globe, Lock } from 'lucide-react'
import { BackHeader } from '@/components/layout/PageHeader'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Service, SERVICE_TYPES } from '@/types/database'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/components/ui/Toaster'
import { cn, todayLocal, goBack } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
]

const TYPE_OPTIONS = Object.entries(SERVICE_TYPES).map(([value, label]) => ({ value, label }))

interface ServiceFormProps {
  service?: Service
  heading?: string
}

export function ServiceForm({ service, heading }: ServiceFormProps) {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    date: service?.date ?? todayLocal(),
    type: service?.type ?? 'sunday_morning',
    status: service?.status ?? 'draft',
    theme: service?.theme ?? '',
    notes: service?.notes ?? '',
    is_public: service?.is_public ?? false,
  })

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const initial = useRef(JSON.stringify(form))
  const [saved, setSaved] = useState(false)
  const dirty = useMemo(() => !saved && JSON.stringify(form) !== initial.current, [form, saved])
  const { guard, dialog: leaveDialog } = useUnsavedChanges(dirty)
  const [dateError, setDateError] = useState<string | undefined>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!form.date) { setDateError('Choose the service date'); document.getElementById('service-date')?.focus(); return }
    setLoading(true)

    const payload = {
      date: form.date,
      type: form.type as Service['type'],
      status: form.status as Service['status'],
      theme: form.theme.trim() || null,
      notes: form.notes.trim() || null,
      is_public: form.is_public,
    }

    if (service) {
      const { error } = await supabase.from('services').update(payload).eq('id', service.id)
      if (error) { toast.error('Failed to update service'); setLoading(false); return }
      toast.success('Service updated')
      setSaved(true)
      router.push(`/services/${service.id}`)
    } else {
      const { data, error } = await supabase
        .from('services')
        .insert({ ...payload, created_by: user.id })
        .select()
        .single()
      if (error) { toast.error('Failed to create service'); setLoading(false); return }
      toast.success('Service created')
      setSaved(true)
      router.push(`/services/${data.id}`)
    }
  }

  return (
    <>
    {heading && (
      <BackHeader title={heading}>
        <Button variant="ghost" size="icon" type="button" onClick={() => guard(() => goBack(router, service ? `/services/${service.id}` : '/services'))} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </BackHeader>
    )}
    {leaveDialog}
    <form onSubmit={handleSubmit} noValidate className="px-4 pt-6 max-w-2xl space-y-8">
      <section aria-labelledby="svc-details" className="space-y-4">
        <h2 id="svc-details" className="text-base font-semibold text-[var(--fg)]">Service details</h2>
        <Input
          id="service-date"
          label="Date *"
          type="date"
          value={form.date}
          onChange={(e) => { set('date', e.target.value); setDateError(undefined) }}
          required
          aria-required="true"
          error={dateError}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
            options={TYPE_OPTIONS}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>

        <Input
          label="Theme / Title"
          value={form.theme}
          onChange={(e) => set('theme', e.target.value)}
          placeholder="e.g. Hope in the Storm"
        />

        {/* Visibility toggle */}
        <button
          type="button"
          onClick={() => setForm((prev) => ({ ...prev, is_public: !prev.is_public }))}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-left transition-colors hover:bg-[var(--bg-card-hover)]"
        >
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            form.is_public ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[var(--bg-card)] text-[var(--fg-muted)]'
          )}>
            {form.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--fg)]">
              {form.is_public ? 'Public' : 'Private'}
            </p>
            <p className="text-xs text-[var(--fg-muted)]">
              {form.is_public
                ? 'All users on the app can view this service'
                : 'Only you can see this service'}
            </p>
          </div>
          <div className={cn(
            'relative w-11 h-6 rounded-full border-0 outline-none shrink-0 transition-colors duration-200',
            form.is_public ? 'bg-emerald-500' : 'bg-[var(--border)]'
          )}
            style={{ minWidth: '2.75rem' }}
          >
            <span className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm pointer-events-none transition-transform duration-200',
              form.is_public ? 'translate-x-5' : 'translate-x-0.5'
            )} />
          </div>
        </button>
      </section>

      <section aria-labelledby="svc-notes" className="space-y-3">
        <h2 id="svc-notes" className="text-base font-semibold text-[var(--fg)]">Notes <span className="font-normal text-sm text-[var(--fg-subtle)]">(optional)</span></h2>
        <Textarea
          label="Service Notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Announcements, special items, tech notes..."
          rows={4}
        />
      </section>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={() => guard(() => goBack(router, service ? `/services/${service.id}` : '/services'))} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          {loading ? 'Saving…' : service ? 'Save changes' : 'Create service'}
        </Button>
      </div>
    </form>
    </>
  )
}
