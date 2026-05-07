import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.BIBLE_API_KEY ?? ''
const BIBLE_ID = process.env.BIBLE_ID ?? ''
const BASE = 'https://api.scripture.api.bible/v1'

const headers = { 'api-key': API_KEY }

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const op = searchParams.get('op')

  if (!API_KEY || !BIBLE_ID) {
    return NextResponse.json({ error: 'Bible API not configured' }, { status: 503 })
  }

  try {
    if (op === 'search') {
      const q = searchParams.get('q') ?? ''
      const res = await fetch(
        `${BASE}/bibles/${BIBLE_ID}/search?query=${encodeURIComponent(q)}&limit=8`,
        { headers }
      )
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.message ?? 'API error' }, { status: res.status })
      const verses = (data?.data?.verses ?? []).map((v: any) => ({
        reference: v.reference,
        text: v.text?.replace(/<[^>]+>/g, '').trim(),
      }))
      return NextResponse.json({ verses })
    }

    if (op === 'passage') {
      const id = searchParams.get('id') ?? ''
      const res = await fetch(
        `${BASE}/bibles/${BIBLE_ID}/passages/${encodeURIComponent(id)}?content-type=text&include-verse-numbers=false&include-titles=false`,
        { headers }
      )
      const data = await res.json()
      const text = data?.data?.content?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      const reference = data?.data?.reference
      return NextResponse.json({ text, reference })
    }

    return NextResponse.json({ error: 'Unknown op' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Bible API error' }, { status: 500 })
  }
}
