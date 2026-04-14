import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ results: [] })

  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=10&media=music`,
      { cache: 'no-store' }
    )

    if (!res.ok) {
      return NextResponse.json({ error: `iTunes API returned ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    const tracks = (data.results ?? []) as any[]

    const results = tracks.slice(0, 8).map((t) => ({
      id: t.trackId,
      title: t.trackName ?? '',
      artist: t.artistName ?? '',
      thumbnail: t.artworkUrl100 ?? null,
    }))

    return NextResponse.json({ results })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 })
  }
}
