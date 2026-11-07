'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener: (t: 'release', cb: () => void) => void }

/**
 * Keeps the screen from dimming/sleeping while `enabled` — for reading lyrics
 * on a phone or tablet on a music stand. Uses the Screen Wake Lock API
 * (Android Chrome, iOS/iPadOS 16.4+). The browser drops the lock whenever the
 * tab is hidden, so it is re-acquired when the page becomes visible again.
 */
export function useWakeLock(enabled: boolean) {
  const sentinel = useRef<WakeLockSentinelLike | null>(null)
  const [active, setActive] = useState(false)
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  const acquire = useCallback(async () => {
    if (!supported || sentinel.current || document.visibilityState !== 'visible') return
    try {
      const s = await (navigator as unknown as { wakeLock: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock.request('screen')
      sentinel.current = s
      setActive(true)
      s.addEventListener('release', () => {
        sentinel.current = null
        setActive(false)
      })
    } catch {
      // Denied (e.g. low battery mode) — nothing to do
    }
  }, [supported])

  useEffect(() => {
    if (!enabled) {
      sentinel.current?.release().catch(() => {})
      sentinel.current = null
      setActive(false)
      return
    }
    acquire()
    const onVisible = () => { if (document.visibilityState === 'visible') acquire() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      sentinel.current?.release().catch(() => {})
      sentinel.current = null
    }
  }, [enabled, acquire])

  return { supported, active }
}
