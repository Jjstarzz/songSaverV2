import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-14 px-6 text-center', className)}>
      <div aria-hidden className="w-14 h-14 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-center mb-4 text-[var(--fg-subtle)]">
        {icon}
      </div>
      <h2 className="text-base font-semibold text-[var(--fg)] mb-1">{title}</h2>
      <p className="text-sm text-[var(--fg-muted)] max-w-xs leading-relaxed mb-5">{description}</p>
      {action}
    </div>
  )
}
