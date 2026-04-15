import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BottomNav } from '@/components/layout/BottomNav'
import { Toaster } from '@/components/ui/Toaster'
import { ServiceWorkerInit } from '@/components/layout/ServiceWorkerInit'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import { OfflineBanner } from '@/components/ui/OfflineBanner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
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
    statusBarStyle: 'black-translucent',
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
  themeColor: '#0a0a0f',
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <OfflineBanner />
          {/* Max-width container centred on large screens, full-width on mobile */}
          <div className="min-h-screen pb-24 max-w-lg mx-auto relative">
            {children}
          </div>
          <BottomNav />
          <Toaster />
          <ServiceWorkerInit />
        </ThemeProvider>
      </body>
    </html>
  )
}
