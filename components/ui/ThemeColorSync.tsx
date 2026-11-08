'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

// Background colour of each theme — keep in sync with --bg in globals.css.
const THEME_BG: Record<string, string> = {
  dark: '#15151b',
  cream: '#f1ede6',
  light: '#f3f4f7',
}

/**
 * Keeps <meta name="theme-color"> matching the active theme, so the Android
 * status bar / browser chrome and the iOS status bar blend with the app
 * instead of always being dark.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const color = THEME_BG[resolvedTheme ?? 'cream'] ?? THEME_BG.cream
    let metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    if (metas.length === 0) {
      const m = document.createElement('meta')
      m.name = 'theme-color'
      document.head.appendChild(m)
      metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    }
    metas.forEach((m) => { m.content = color })
  }, [resolvedTheme])

  return null
}
