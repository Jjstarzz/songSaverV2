'use client'

import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-accent-600 hover:bg-accent-700 text-white',
        secondary:
          'bg-transparent hover:bg-[var(--bg-hover)] text-[var(--fg)] border border-[var(--border-strong)]',
        ghost:
          'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-hover)]',
        destructive:
          'bg-[var(--bg-elevated)] text-[var(--danger)] border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]',
        outline:
          'border border-[var(--accent-border)] text-[var(--accent-fg)] hover:bg-[var(--accent-soft)]',
      },
      size: {
        sm: 'text-sm px-3 h-10',
        md: 'text-sm px-4 h-11',
        lg: 'text-base px-6 h-12',
        icon: 'w-11 h-11',
        'icon-sm': 'w-10 h-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <span aria-hidden className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { buttonVariants }
