import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ results: [] })

  const token = process.env.GENIUS_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'GENIUS_ACCESS_TOKEN not set' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://api.genius.com/search?q=${encodeURIComponent(q)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json(
        { error: `Genius API returned ${res.status}`, detail: body },
        { status: res.status }
      )
    }

    const data = await res.json()
    const hits = (data.response?.hits ?? []) as any[]

    const results = hits
      .filter((h) => h.type === 'song')
      .slice(0, 8)
      .map((h) => ({
        id: h.result.id,
        title: h.result.title,
        artist: h.result.primary_artist?.name ?? '',
        thumbnail: h.result.song_art_image_thumbnail_url ?? null,
      }))

    return NextResponse.json({ results })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 })
  }
}
