import React from 'react'
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer'
import { SERVICE_TYPES, formatKey } from '@/types/database'

// Noto Sans Malayalam covers both Malayalam script AND Latin characters
Font.register({
  family: 'Noto',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansMalayalam/NotoSansMalayalam-Regular.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansMalayalam/NotoSansMalayalam-Bold.ttf',
      fontWeight: 700,
    },
  ],
})

// Silence the default hyphenation warning
Font.registerHyphenationCallback(word => [word])

export interface PdfSong {
  order_index: number
  key_override: string | null
  songs: {
    id: string
    title: string
    artist: string | null
    default_key: string | null
    mode: 'major' | 'minor' | null
    song_lyrics: { lyrics: string; language: string; is_default: boolean }[]
  }
}

export interface PdfService {
  date: string
  type: string
  theme: string | null
  notes: string | null
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

type LyricsSection = { label: string | null; lines: string[] }

function parseLyricSections(raw: string): LyricsSection[] {
  const sections: LyricsSection[] = []
  let cur: LyricsSection = { label: null, lines: [] }
  for (const line of raw.split('\n')) {
    const m = line.match(/^\[(.+)\]$/)
    if (m) {
      if (cur.lines.some(l => l.trim())) sections.push(cur)
      cur = { label: m[1], lines: [] }
    } else {
      cur.lines.push(line)
    }
  }
  if (cur.lines.some(l => l.trim())) sections.push(cur)
  return sections
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Noto',
    fontWeight: 400,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 52,
    fontSize: 11,
    color: '#111111',
  },
  title: { fontSize: 20, fontWeight: 700, lineHeight: 1.2, marginBottom: 3 },
  meta: { fontSize: 9, color: '#555555' },
  notes: { fontSize: 9, color: '#666666', marginTop: 3 },
  headerRule: { borderBottomWidth: 1.5, borderBottomColor: '#111111', marginTop: 10, marginBottom: 14 },

  songBlock: { marginBottom: 12 },
  songHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  songNumber: { fontSize: 9, color: '#aaaaaa', width: 22, flexShrink: 0, paddingTop: 4 },
  songTitleWrap: { flex: 1 },
  songTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  songTitle: { fontSize: 13, fontWeight: 700, marginRight: 6 },
  keyBadge: {
    fontSize: 8, color: '#6d28d9', backgroundColor: '#ede9fe',
    paddingLeft: 5, paddingRight: 5, paddingTop: 2, paddingBottom: 2,
    borderRadius: 3,
  },
  artist: { fontSize: 9, color: '#777777', marginTop: 2, marginBottom: 5 },
  lyricsWrap: { paddingLeft: 22 },
  section: { marginBottom: 7 },
  sectionLabel: {
    fontSize: 7, fontWeight: 700, color: '#999999',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2,
  },
  primaryLines: { fontSize: 10.5, lineHeight: 1.85 },
  translationLines: {
    fontSize: 9.5, color: '#555555', lineHeight: 1.7,
    marginTop: 3, paddingLeft: 7,
    borderLeftWidth: 1.5, borderLeftColor: '#d4bbff',
  },
  songDivider: { borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0', marginVertical: 10 },
  footer: {
    position: 'absolute', bottom: 24, left: 52, right: 52,
    textAlign: 'center', fontSize: 7.5, color: '#cccccc',
  },
})

interface DocProps {
  service: PdfService
  songs: PdfSong[]
  userKeys: Record<string, string>
}

function ServiceDocument({ service, songs, userKeys }: DocProps) {
  const title = service.theme || SERVICE_TYPES[service.type as keyof typeof SERVICE_TYPES] || 'Service'
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Service header ── */}
        <View wrap={false}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.meta}>
            {fmtDate(service.date)}{'  ·  '}{SERVICE_TYPES[service.type as keyof typeof SERVICE_TYPES]}
          </Text>
          {service.notes ? <Text style={s.notes}>{service.notes}</Text> : null}
          <View style={s.headerRule} />
        </View>

        {/* ── Songs ── */}
        {songs.map((item, index) => {
          const song = item.songs
          const resolvedKey = item.key_override ?? userKeys[song.id] ?? song.default_key
          const keyLabel = formatKey(resolvedKey, song.mode)
          const defaultLyric = song.song_lyrics?.find(l => l.is_default) ?? song.song_lyrics?.[0] ?? null
          const secondaryLyric = song.song_lyrics?.length > 1
            ? (song.song_lyrics.find(l => l !== defaultLyric) ?? null)
            : null
          const primarySections = defaultLyric ? parseLyricSections(defaultLyric.lyrics) : []
          const secondarySections = secondaryLyric ? parseLyricSections(secondaryLyric.lyrics) : []

          return (
            <View key={index} style={s.songBlock}>
              {/* Song title row — kept together, won't break mid-title */}
              <View style={s.songHeader} wrap={false}>
                <Text style={s.songNumber}>{index + 1}.</Text>
                <View style={s.songTitleWrap}>
                  <View style={s.songTitleRow}>
                    <Text style={s.songTitle}>{song.title}</Text>
                    {keyLabel ? <Text style={s.keyBadge}>{keyLabel}</Text> : null}
                  </View>
                  {song.artist ? <Text style={s.artist}>{song.artist}</Text> : null}
                </View>
              </View>

              {/* Lyrics sections — each section stays together */}
              <View style={s.lyricsWrap}>
                {primarySections.length === 0 && (
                  <Text style={{ fontSize: 9, color: '#bbbbbb' }}>No lyrics saved</Text>
                )}
                {primarySections.map((sec, si) => {
                  const trans = secondarySections[si]
                  const transText = trans?.lines.join('\n').trim()
                  return (
                    <View key={si} style={s.section} wrap={false}>
                      {sec.label ? <Text style={s.sectionLabel}>{sec.label}</Text> : null}
                      <Text style={s.primaryLines}>{sec.lines.join('\n').trim()}</Text>
                      {transText ? <Text style={s.translationLines}>{transText}</Text> : null}
                    </View>
                  )
                })}
              </View>

              {index < songs.length - 1 ? <View style={s.songDivider} /> : null}
            </View>
          )
        })}

        <Text style={s.footer} fixed>SongSaver  ·  {today}</Text>
      </Page>
    </Document>
  )
}

export async function generateServicePdf(
  service: PdfService,
  songs: PdfSong[],
  userKeys: Record<string, string>,
): Promise<Blob> {
  return pdf(<ServiceDocument service={service} songs={songs} userKeys={userKeys} />).toBlob()
}
