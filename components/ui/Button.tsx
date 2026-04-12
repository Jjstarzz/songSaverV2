'use client'

import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary:
          'bg-accent-600 hover:bg-accent-500 text-white shadow-glow-sm',
        secondary:
          'bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10',
        ghost:
          'hover:bg-white/[0.08] text-white/70 hover:text-white',
        destructive:
          'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20',
        outline:
          'border border-accent-500/40 hover:border-accent-500/70 text-accent-400 hover:bg-accent-500/10',
      },
      size: {
        sm: 'text-xs px-3 py-1.5 h-8',
        md: 'text-sm px-4 py-2.5 h-10',
        lg: 'text-base px-6 py-3.5 h-12',
        icon: 'w-10 h-10 rounded-xl',
        'icon-sm': 'w-8 h-8 rounded-lg',
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
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { buttonVariants }
