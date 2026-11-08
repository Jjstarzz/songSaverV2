import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

/** Top-of-page title for main sections (Songs, Services…). */
export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('page-top flex items-end justify-between gap-3 px-4 pb-4', className)}>
      <div className="min-w-0">
        <h1 className="text-[28px] lg:text-[34px] leading-tight font-medium text-[var(--fg)] truncate">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-[var(--fg-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  )
}

interface BackHeaderProps {
  title: string
  action?: React.ReactNode
  children?: React.ReactNode
  /** Hide the title (e.g. when the page shows it prominently below) */
  hideTitle?: boolean
}

/** Sticky toolbar for detail pages: back button (children), title, actions. */
export function BackHeader({ title, action, children, hideTitle }: BackHeaderProps) {
  return (
    <div className="sticky-header-bg sticky top-0 z-40 border-b border-[var(--border)]">
      <div className="flex items-center gap-1 px-2 h-14">
        {children}
        {hideTitle
          ? <p className="sr-only">{title}</p>
          : <h1 className="flex-1 min-w-0 font-sans tracking-normal text-[15px] font-semibold text-[var(--fg)] truncate">{title}</h1>}
        {hideTitle && <span className="flex-1" />}
        {action && <div className="flex items-center gap-1 shrink-0">{action}</div>}
      </div>
    </div>
  )
}
