import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { imageBase64, mediaType, mode = 'full' } = body

  if (!imageBase64 || !mediaType) {
    return NextResponse.json({ error: 'Missing image data' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: mode === 'lyrics-only'
              ? `Extract the song lyrics from this image.
Rules:
- Preserve the original line breaks exactly as they appear
- If you can identify section labels (Verse, Chorus, Bridge, Pre-Chorus, Outro, etc.), format them as [Verse 1], [Chorus], etc. on their own line before each section
- If section labels are already visible in the image, use those
- Remove page numbers, watermarks, copyright notices, and any non-lyric text
- Output only the lyrics — no preamble, no explanation
- If no lyrics are visible, reply with exactly: NO_LYRICS_FOUND`
              : `Extract song information from this image and respond with ONLY a JSON object — no markdown, no explanation, no code fences.

JSON format:
{
  "title": "Song title or null if not visible",
  "artist": "Artist/band name or null if not visible",
  "lyrics": "Full lyrics text or null if not visible"
}

Lyrics rules:
- Preserve original line breaks exactly
- Format section labels as [Verse 1], [Chorus], [Bridge], etc. on their own line
- Remove page numbers, watermarks, copyright notices, non-lyric text

If absolutely no song content is visible, respond with exactly: NO_CONTENT_FOUND`,
          },
        ],
      },
    ],
  })

  const text = (message.content[0] as { type: string; text: string }).text?.trim() ?? ''

  if (text === 'NO_LYRICS_FOUND' || text === 'NO_CONTENT_FOUND') {
    return NextResponse.json({ error: 'No song content found in image' }, { status: 422 })
  }

  // Legacy lyrics-only mode (used by SongForm inline camera button)
  if (mode === 'lyrics-only') {
    return NextResponse.json({ lyrics: text })
  }

  // Full mode: parse structured JSON from Claude
  try {
    const parsed = JSON.parse(text)
    return NextResponse.json({
      title: parsed.title ?? null,
      artist: parsed.artist ?? null,
      lyrics: parsed.lyrics ?? null,
    })
  } catch {
    return NextResponse.json({ title: null, artist: null, lyrics: text })
  }
}
