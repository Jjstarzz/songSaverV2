import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Crawlers, link-preview fetchers and uptime checkers never carry cookies, so
// each of their requests used to create a brand-new anonymous user.
const BOT_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|skype|vkshare|pinterest|bitly|curl|wget|python-requests|httpclient|axios|node-fetch|go-http-client|headless|lighthouse|pingdom|uptime|monitor/i

/**
 * Only create an anonymous session for a real person loading a page:
 * - not API routes (a cookie-less script would get a new account per call)
 * - not prefetches (they run after a page load that already has a session)
 * - not bots / link previews / empty user agents
 */
function shouldCreateAnonymousSession(request: NextRequest): boolean {
  if (request.nextUrl.pathname.startsWith('/api/')) return false
  const h = request.headers
  if (h.get('next-router-prefetch') || h.get('purpose') === 'prefetch' || h.get('sec-purpose')?.includes('prefetch')) {
    return false
  }
  const ua = h.get('user-agent') ?? ''
  if (!ua || BOT_UA.test(ua)) return false
  return true
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  // Refresh session + auto sign-in anonymously if no session
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && shouldCreateAnonymousSession(request)) {
    await supabase.auth.signInAnonymously()
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
