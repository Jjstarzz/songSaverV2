import type { Metadata, Viewport } from 'next'
import { Hanken_Grotesk, Newsreader } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/Toaster'
import { ServiceWorkerInit } from '@/components/layout/ServiceWorkerInit'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { ThemeColorSync } from '@/components/ui/ThemeColorSync'

const sans = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const display = Newsreader({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  adjustFontFallback: false,
})

export const metadata: Metadata = {
  title: {
    default: 'SongSaver',
    template: '%s — SongSaver',
  },
  description: 'Worship song management for modern church teams',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SongSaver',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#f3f1ec', // paper/cream (default theme); ThemeColorSync updates it at runtime
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${sans.variable} ${display.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="cream" themes={['dark', 'cream', 'light']} enableSystem={false}>
          <OfflineBanner />
          <AppShell>{children}</AppShell>
          <Toaster />
          <ServiceWorkerInit />
          <ThemeColorSync />
        </ThemeProvider>
      </body>
    </html>
  )
}
