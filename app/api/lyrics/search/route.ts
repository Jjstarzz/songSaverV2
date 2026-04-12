import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ results: [] })

  const token = process.env.GENIUS_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Genius API token not configured' }, { status: 500 })
  }

  const res = await fetch(
    `https://api.genius.com/search?q=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Genius API error' }, { status: res.status })
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
}
