const CACHE_NAME = 'songsaver-v3'
const OFFLINE_PAGE = '/offline.html'

// Pages to pre-fetch and cache during install
const PRECACHE_PAGES = ['/', '/songs', '/services', '/settings']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Always cache the offline fallback page first
      await cache.add(OFFLINE_PAGE)

      // Try to cache main app pages — best effort (don't fail install if any 404)
      await Promise.allSettled(
        PRECACHE_PAGES.map((url) =>
          fetch(url, { cache: 'no-store' })
            .then((res) => { if (res.ok) cache.put(url, res) })
            .catch(() => {})
        )
      )
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, cross-origin, Supabase, and Next.js server requests
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/_next/data/')
  ) {
    return
  }

  // Cache-first for immutable static bundles (content-hashed filenames)
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
            caches.open(CACHE_NAME).then((c) => c.put(request, res.clone()))
            return res
          })
      )
    )
    return
  }

  // Network-first for page navigations — cache successful responses, serve offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Cache the fresh page for next offline visit
          if (res.ok) {
            caches.open(CACHE_NAME).then((c) => c.put(request, res.clone()))
          }
          return res
        })
        .catch(async () => {
          // Try the cached version of this specific page
          const cached = await caches.match(request)
          if (cached) return cached
          // Fall back to cached root if available
          const root = await caches.match('/')
          if (root) return root
          // Last resort: offline fallback page
          return caches.match(OFFLINE_PAGE)
        })
    )
  }
})
