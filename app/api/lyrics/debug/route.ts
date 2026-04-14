import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Temporary debug endpoint — safe to delete once search is confirmed working
export async function GET() {
  try {
    const res = await fetch(
      'https://itunes.apple.com/search?term=amazing+grace&entity=song&limit=2&media=music',
      { cache: 'no-store' }
    )
    const data = await res.json()
    return NextResponse.json({
      itunesOk: res.ok,
      resultCount: data.resultCount ?? 0,
      firstResult: data.results?.[0]?.trackName ?? null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message })
  }
}
