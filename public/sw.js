const CACHE_NAME = 'songsaver-v2'

// App-shell pages to pre-cache
const PRECACHE_URLS = ['/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
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

  // Skip non-GET, cross-origin, Supabase, and internal Next.js requests
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/_next/data/')  // dynamic RSC payloads — always fresh
  ) {
    return
  }

  // Cache-first for immutable static assets (_next/static has content hashes)
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached ?? fetch(request).then((res) => {
          caches.open(CACHE_NAME).then((c) => c.put(request, res.clone()))
          return res
        })
      )
    )
    return
  }

  // Network-first for navigation — cache successful responses as fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE_NAME).then((c) => c.put(request, res.clone()))
          return res
        })
        .catch(() => caches.match(request))
    )
  }
})
