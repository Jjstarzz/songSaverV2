import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between px-4 pt-12 pb-4', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-white tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 ml-3 mt-0.5">{action}</div>}
    </div>
  )
}

interface BackHeaderProps {
  title: string
  action?: React.ReactNode
  children?: React.ReactNode
}

export function BackHeader({ title, action, children }: BackHeaderProps) {
  return (
    <div className="sticky-header-bg sticky top-0 z-40 bg-[var(--bg)]/90 backdrop-blur-xl border-b border-[var(--border)]">
      <div className="flex items-center gap-2 px-3 py-3 max-w-lg mx-auto">
        {children}
        <h1 className="flex-1 text-base font-semibold text-white truncate">{title}</h1>
        {action && <div className="flex items-center gap-1 shrink-0">{action}</div>}
      </div>
    </div>
  )
}
