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
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-4 text-white/30">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white/80 mb-1">{title}</h3>
      <p className="text-sm text-white/40 max-w-xs leading-relaxed mb-6">{description}</p>
      {action}
    </div>
  )
}
