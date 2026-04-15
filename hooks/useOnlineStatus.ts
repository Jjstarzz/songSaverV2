'use client'

import { useEffect, useState } from 'react'

export function useOnlineStatus() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    // Set initial value (only available client-side)
    setOnline(navigator.onLine)

    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}
