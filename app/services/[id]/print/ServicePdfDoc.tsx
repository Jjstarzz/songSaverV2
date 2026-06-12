import React from 'react'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { SERVICE_TYPES, formatKey } from '@/types/database'

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
  page: { fontFamily: 'Times-Roman', paddingTop: 44, paddingBottom: 44, paddingHorizontal: 56, fontSize: 11, color: '#111111' },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', lineHeight: 1.2, marginBottom: 3 },
  meta: { fontSize: 9, color: '#555555', fontFamily: 'Helvetica' },
  notes: { fontSize: 9, color: '#666666', fontFamily: 'Helvetica', fontStyle: 'italic', marginTop: 3 },
  headerRule: { borderBottomWidth: 1.5, borderBottomColor: '#111111', marginTop: 10, marginBottom: 16 },
  songBlock: { marginBottom: 10 },
  songTitleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  songNumber: { fontSize: 9, color: '#aaaaaa', fontFamily: 'Helvetica', paddingTop: 3, width: 20, flexShrink: 0 },
  songTitleWrap: { flex: 1 },
  songTitleInner: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 5 },
  songTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  keyBadge: { fontSize: 8, color: '#6d28d9', backgroundColor: '#ede9fe', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  artist: { fontSize: 9, color: '#777777', fontFamily: 'Helvetica', marginTop: 2, marginBottom: 6 },
  lyricsWrap: { paddingLeft: 20 },
  section: { marginBottom: 7 },
  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#999999', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  primaryLines: { fontSize: 10.5, fontFamily: 'Times-Roman', lineHeight: 1.8 },
  translationLines: { fontSize: 9.5, fontFamily: 'Times-Italic', color: '#555555', lineHeight: 1.65, marginTop: 3, paddingLeft: 6, borderLeftWidth: 1.5, borderLeftColor: '#d4bbff' },
  songDivider: { borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0', marginVertical: 10 },
  footer: { position: 'absolute', bottom: 24, left: 56, right: 56, textAlign: 'center', fontSize: 7.5, color: '#cccccc', fontFamily: 'Helvetica' },
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
        {/* Header */}
        <View>
          <Text style={s.title}>{title}</Text>
          <Text style={s.meta}>{fmtDate(service.date)}{'  ·  '}{SERVICE_TYPES[service.type as keyof typeof SERVICE_TYPES]}</Text>
          {service.notes ? <Text style={s.notes}>{service.notes}</Text> : null}
        </View>
        <View style={s.headerRule} />

        {/* Songs */}
        {songs.map((item, index) => {
          const song = item.songs
          const resolvedKey = item.key_override ?? userKeys[song.id] ?? song.default_key
          const keyLabel = formatKey(resolvedKey, song.mode)
          const defaultLyric = song.song_lyrics?.find(l => l.is_default) ?? song.song_lyrics?.[0] ?? null
          const secondaryLyric = song.song_lyrics?.length > 1 ? (song.song_lyrics.find(l => l !== defaultLyric) ?? null) : null
          const primarySections = defaultLyric ? parseLyricSections(defaultLyric.lyrics) : []
          const secondarySections = secondaryLyric ? parseLyricSections(secondaryLyric.lyrics) : []

          return (
            <View key={index} style={s.songBlock} wrap={false}>
              <View style={s.songTitleRow}>
                <Text style={s.songNumber}>{index + 1}.</Text>
                <View style={s.songTitleWrap}>
                  <View style={s.songTitleInner}>
                    <Text style={s.songTitle}>{song.title}</Text>
                    {keyLabel ? <Text style={s.keyBadge}>{keyLabel}</Text> : null}
                  </View>
                  {song.artist ? <Text style={s.artist}>{song.artist}</Text> : null}
                </View>
              </View>

              <View style={s.lyricsWrap}>
                {primarySections.length === 0 && (
                  <Text style={{ fontSize: 9, color: '#bbbbbb', fontFamily: 'Helvetica', fontStyle: 'italic' }}>No lyrics saved</Text>
                )}
                {primarySections.map((sec, si) => {
                  const trans = secondarySections[si]
                  const transText = trans?.lines.join('\n').trim()
                  return (
                    <View key={si} style={s.section}>
                      {sec.label ? <Text style={s.sectionLabel}>{sec.label}</Text> : null}
                      <Text style={s.primaryLines}>{sec.lines.join('\n').trim()}</Text>
                      {transText ? <Text style={s.translationLines}>{transText}</Text> : null}
                    </View>
                  )
                })}
              </View>

              {index < songs.length - 1 && <View style={s.songDivider} />}
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
