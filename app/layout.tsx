import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/Toaster'
import { ServiceWorkerInit } from '@/components/layout/ServiceWorkerInit'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { ThemeColorSync } from '@/components/ui/ThemeColorSync'

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
  themeColor: '#f1ede6', // cream (default theme); ThemeColorSync updates it at runtime
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
      <body className={`${inter.variable} font-sans`}>
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
