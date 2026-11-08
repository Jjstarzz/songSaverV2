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
      <div aria-hidden className="flex items-center justify-center mb-4 text-[var(--fg-subtle)] [&_svg]:stroke-[1.5]">
        {icon}
      </div>
      <h2 className="font-display text-xl font-medium text-[var(--fg)] mb-1">{title}</h2>
      <p className="text-sm text-[var(--fg-muted)] max-w-xs leading-relaxed mb-5">{description}</p>
      {action}
    </div>
  )
}
