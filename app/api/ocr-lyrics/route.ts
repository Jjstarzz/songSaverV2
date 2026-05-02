import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { imageBase64, mediaType } = await req.json()

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
            text: `Extract the song lyrics from this image.
Rules:
- Preserve the original line breaks exactly as they appear
- If you can identify section labels (Verse, Chorus, Bridge, Pre-Chorus, Outro, etc.), format them as [Verse 1], [Chorus], etc. on their own line before each section
- If section labels are already visible in the image, use those
- Remove page numbers, watermarks, copyright notices, and any non-lyric text
- Output only the lyrics — no preamble, no explanation
- If no lyrics are visible, reply with exactly: NO_LYRICS_FOUND`,
          },
        ],
      },
    ],
  })

  const text = (message.content[0] as { type: string; text: string }).text?.trim() ?? ''

  if (text === 'NO_LYRICS_FOUND') {
    return NextResponse.json({ error: 'No lyrics found in image' }, { status: 422 })
  }

  return NextResponse.json({ lyrics: text })
}
