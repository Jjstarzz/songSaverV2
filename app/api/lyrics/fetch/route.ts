import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get('artist') ?? ''
  const title = req.nextUrl.searchParams.get('title') ?? ''

  if (!artist || !title) {
    return NextResponse.json({ error: 'Missing artist or title' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 })
    }

    const data = await res.json()
    const lyrics: string = data.lyrics ?? ''

    return NextResponse.json({ lyrics: lyrics.trim() })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch lyrics' }, { status: 500 })
  }
}
