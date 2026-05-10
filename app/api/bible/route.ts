import { NextRequest, NextResponse } from 'next/server'
import { parseReference } from '@/lib/bibleRef'

const API_KEY = process.env.BIBLE_API_KEY ?? ''
const BIBLE_ID = process.env.BIBLE_ID ?? ''
const BASE = 'https://rest.api.bible/v1'

const headers = { 'api-key': API_KEY }

const cleanText = (raw: string) => raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const op = searchParams.get('op')

  if (!API_KEY || !BIBLE_ID) {
    return NextResponse.json({ error: 'Bible API not configured' }, { status: 503 })
  }

  try {
    if (op === 'search') {
      const q = searchParams.get('q') ?? ''

      // Try parsing as a reference first (e.g. "Psalm 23", "John 3:16")
      const refId = parseReference(q)
      if (refId) {
        const res = await fetch(
          `${BASE}/bibles/${BIBLE_ID}/passages/${encodeURIComponent(refId)}?content-type=text&include-verse-numbers=false&include-titles=false`,
          { headers }
        )
        const data = await res.json()
        if (res.ok && data?.data?.content) {
          return NextResponse.json({
            verses: [{ reference: data.data.reference, text: cleanText(data.data.content) }],
          })
        }
        // Fall through to keyword search if passage not found
      }

      // Keyword search
      const res = await fetch(
        `${BASE}/bibles/${BIBLE_ID}/search?query=${encodeURIComponent(q)}&limit=10`,
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
      const text = data?.data?.content ? cleanText(data.data.content) : ''
      const reference = data?.data?.reference
      return NextResponse.json({ text, reference })
    }

    if (op === 'verses') {
      const chapter = searchParams.get('chapter') ?? ''
      const res = await fetch(
        `${BASE}/bibles/${BIBLE_ID}/chapters/${encodeURIComponent(chapter)}/verses`,
        { headers }
      )
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.message ?? 'API error' }, { status: res.status })
      const verses = (data?.data ?? []).map((v: any) => ({ id: v.id, reference: v.reference }))
      return NextResponse.json({ verses })
    }

    return NextResponse.json({ error: 'Unknown op' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Bible API error' }, { status: 500 })
  }
}
