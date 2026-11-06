import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

// Created lazily so `next build` doesn't need ANTHROPIC_API_KEY present.
let anthropic: Anthropic | null = null
const getAnthropic = () => (anthropic ??= new Anthropic())

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number]

// Clients resize to ≤1024px JPEG before upload; 5 MB of base64 is generous headroom.
const MAX_BASE64_LENGTH = 5 * 1024 * 1024

const LYRICS_ONLY_PROMPT = `Extract the song lyrics from this image.
Rules:
- Preserve the original line breaks exactly as they appear
- If you can identify section labels (Verse, Chorus, Bridge, Pre-Chorus, Outro, etc.), format them as [Verse 1], [Chorus], etc. on their own line before each section
- If section labels are already visible in the image, use those
- Remove page numbers, watermarks, copyright notices, and any non-lyric text
- Output only the lyrics — no preamble, no explanation
- If no lyrics are visible, reply with exactly: NO_LYRICS_FOUND`

const FULL_PROMPT = `Extract song information from this image and respond with ONLY a JSON object — no markdown, no explanation, no code fences.

JSON format:
{
  "title": "Song title or null if not visible",
  "artist": "Artist/band name or null if not visible",
  "lyrics": "Full lyrics text or null if not visible",
  "verseview_number": "A VerseView catalog/song number if visible, as an integer, or null"
}

Lyrics rules:
- Preserve original line breaks exactly
- Format section labels as [Verse 1], [Chorus], [Bridge], etc. on their own line
- Remove page numbers, watermarks, copyright notices, non-lyric text

VerseView number rules:
- Look for a standalone number labeled "VerseView", "VV", "Song #", "No.", or a bare "#123" near the title or in a corner of the image
- Only extract it if it's clearly a catalog/reference number for the song, not a page number, verse number, or date
- If none is visible, use null

If absolutely no song content is visible, respond with exactly: NO_CONTENT_FOUND`

export async function POST(req: NextRequest) {
  // Require a Supabase session so this paid endpoint can't be hit by
  // arbitrary scripts that never loaded the app.
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let body: { imageBase64?: unknown; mediaType?: unknown; mode?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { imageBase64, mediaType } = body
  const mode = body.mode === 'lyrics-only' ? 'lyrics-only' : 'full'

  if (typeof imageBase64 !== 'string' || !imageBase64 || typeof mediaType !== 'string') {
    return NextResponse.json({ error: 'Missing image data' }, { status: 400 })
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType as AllowedMediaType)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 })
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: 'Image is too large' }, { status: 413 })
  }

  let text: string
  try {
    const message = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as AllowedMediaType, data: imageBase64 },
            },
            { type: 'text', text: mode === 'lyrics-only' ? LYRICS_ONLY_PROMPT : FULL_PROMPT },
          ],
        },
      ],
    })
    text = message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim()
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Too many requests — try again in a moment' }, { status: 429 })
    }
    if (err instanceof Anthropic.BadRequestError) {
      return NextResponse.json({ error: 'Could not read that image' }, { status: 400 })
    }
    console.error('OCR request failed', err)
    return NextResponse.json({ error: 'Text recognition is unavailable right now' }, { status: 502 })
  }

  if (!text || text === 'NO_LYRICS_FOUND' || text === 'NO_CONTENT_FOUND') {
    return NextResponse.json({ error: 'No song content found in image' }, { status: 422 })
  }

  // Legacy lyrics-only mode (used by SongForm / LyricsViewer inline camera button)
  if (mode === 'lyrics-only') {
    return NextResponse.json({ lyrics: text })
  }

  // Full mode: parse structured JSON from Claude
  // Strip markdown code fences if Claude added them despite instructions
  const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try {
    const parsed = JSON.parse(jsonText)
    const verseviewNumber = parseInt(parsed.verseview_number, 10)
    return NextResponse.json({
      title: parsed.title ?? null,
      artist: parsed.artist ?? null,
      lyrics: parsed.lyrics ?? null,
      verseview_number: Number.isFinite(verseviewNumber) ? verseviewNumber : null,
    })
  } catch {
    return NextResponse.json({ title: null, artist: null, lyrics: jsonText, verseview_number: null })
  }
}
