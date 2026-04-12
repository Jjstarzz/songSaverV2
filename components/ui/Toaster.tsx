'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, X, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

// Simple global toast system
const listeners: ((toast: Toast) => void)[] = []

export function toast(message: string, type: ToastType = 'info') {
  const t: Toast = { id: Math.random().toString(36).slice(2), message, type }
  listeners.forEach((fn) => fn(t))
}
toast.success = (msg: string) => toast(msg, 'success')
toast.error = (msg: string) => toast(msg, 'error')
toast.info = (msg: string) => toast(msg, 'info')

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts((prev) => [...prev, t])
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id))
      }, 3500)
    }
    listeners.push(handler)
    return () => {
      const idx = listeners.indexOf(handler)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [])

  const remove = (id: string) => setToasts((prev) => prev.filter((x) => x.id !== id))

  return (
    <div className="fixed top-4 right-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-card animate-slide-up pointer-events-auto',
            t.type === 'success' && 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300',
            t.type === 'error' && 'bg-red-950/90 border-red-500/30 text-red-300',
            t.type === 'info' && 'bg-base-800/90 border-white/10 text-white/80'
          )}
        >
          {t.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
          {t.type === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
          {t.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
          <span className="text-sm flex-1">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="text-current/50 hover:text-current transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
