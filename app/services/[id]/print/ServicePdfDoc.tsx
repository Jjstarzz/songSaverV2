import React from 'react'
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer'
import { PDF_FONT_PT, type PdfModel, type PdfOptions, type PdfSection } from '@/lib/servicePdf'

// Noto Sans Malayalam also covers Latin; Tamil is a per-character fallback.
const NOTO = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf'
Font.register({
  family: 'NotoMalayalam',
  fonts: [
    { src: `${NOTO}/NotoSansMalayalam/NotoSansMalayalam-Regular.ttf`, fontWeight: 400 },
    { src: `${NOTO}/NotoSansMalayalam/NotoSansMalayalam-Bold.ttf`, fontWeight: 700 },
  ],
})
Font.register({
  family: 'NotoTamil',
  fonts: [
    { src: `${NOTO}/NotoSansTamil/NotoSansTamil-Regular.ttf`, fontWeight: 400 },
    { src: `${NOTO}/NotoSansTamil/NotoSansTamil-Bold.ttf`, fontWeight: 700 },
  ],
})
const FONT_STACK = ['NotoMalayalam', 'NotoTamil']

// Don't hyphenate lyrics
Font.registerHyphenationCallback((word) => [word])

const ACCENT = '#6d28d9'

function makeStyles(base: number) {
  return StyleSheet.create({
    page: {
      fontFamily: FONT_STACK,
      fontWeight: 400,
      paddingTop: 42,
      paddingBottom: 50,
      paddingHorizontal: 48,
      fontSize: base,
      color: '#1a1a1a',
    },
    header: { marginBottom: 16 },
    eyebrow: { fontSize: 7.5, fontWeight: 700, color: ACCENT, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
    title: { fontSize: base * 1.9, fontWeight: 700, lineHeight: 1.15 },
    meta: { fontSize: base * 0.82, color: '#666666', marginTop: 4 },
    notes: { fontSize: base * 0.82, color: '#555555', marginTop: 8, padding: 8, backgroundColor: '#f6f4fb', borderRadius: 4 },
    headerRule: { borderBottomWidth: 1.5, borderBottomColor: '#1a1a1a', marginTop: 12 },

    songBlock: { marginBottom: base * 1.4 },
    songHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: base * 0.6, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: '#e2e2e2' },
    songNumber: {
      width: base * 1.8, height: base * 1.8, borderRadius: base * 0.9, backgroundColor: ACCENT,
      color: '#ffffff', fontSize: base * 0.8, fontWeight: 700, textAlign: 'center', paddingTop: base * 0.32, marginRight: 8,
    },
    songTitleWrap: { flex: 1 },
    songTitle: { fontSize: base * 1.25, fontWeight: 700 },
    artist: { fontSize: base * 0.8, color: '#777777', marginTop: 1 },
    keyBadge: {
      fontSize: base * 0.78, fontWeight: 700, color: ACCENT, backgroundColor: '#efe9fd',
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginLeft: 8,
    },
    cols: { flexDirection: 'row' },
    col: { flex: 1 },
    colGap: { width: 18 },
    section: { marginBottom: base * 0.75 },
    sectionLabel: { fontSize: base * 0.68, fontWeight: 700, color: ACCENT, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
    lines: { lineHeight: 1.6 },
    translation: {
      fontSize: base * 0.88, color: '#555555', lineHeight: 1.55,
      marginTop: 3, paddingLeft: 7, borderLeftWidth: 1.5, borderLeftColor: '#d4c3fb',
    },
    repeat: { fontSize: base * 0.85, color: '#888888' },
    empty: { fontSize: base * 0.85, color: '#aaaaaa' },
    footer: {
      position: 'absolute', bottom: 24, left: 48, right: 48,
      flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: '#aaaaaa',
    },
  })
}

type Styles = ReturnType<typeof makeStyles>

function Section({ sec, opts, s }: { sec: PdfSection; opts: PdfOptions; s: Styles }) {
  if (sec.repeatOf) {
    return (
      <View style={s.section} wrap={false}>
        <Text style={s.repeat}>
          {sec.label ?? 'Repeat'}
          {sec.label && sec.repeatOf !== sec.label ? ` — as ${sec.repeatOf}` : ''} (repeat)
        </Text>
      </View>
    )
  }
  return (
    <View style={s.section} wrap={false}>
      {opts.showSectionLabels && sec.label ? <Text style={s.sectionLabel}>{sec.label}</Text> : null}
      <Text style={s.lines}>{sec.text}</Text>
      {sec.translation ? <Text style={s.translation}>{sec.translation}</Text> : null}
    </View>
  )
}

function ServiceDocument({ model, opts }: { model: PdfModel; opts: PdfOptions }) {
  const s = makeStyles(PDF_FONT_PT[opts.fontSize])
  const printed = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <Document title={model.title} creator="SongSaver">
      <Page size="A4" style={s.page}>
        <View style={s.header} wrap={false}>
          <Text style={s.eyebrow}>Order of worship</Text>
          <Text style={s.title}>{model.title}</Text>
          <Text style={s.meta}>{model.subtitle}  ·  {model.songs.length} {model.songs.length === 1 ? 'song' : 'songs'}</Text>
          {model.notes ? <Text style={s.notes}>{model.notes}</Text> : null}
          <View style={s.headerRule} />
        </View>

        {model.songs.map((song, i) => (
          <View key={song.number} style={s.songBlock} break={opts.songPerPage && i > 0}>
            <View style={s.songHeader} wrap={false} minPresenceAhead={60}>
              <Text style={s.songNumber}>{song.number}</Text>
              <View style={s.songTitleWrap}>
                <Text style={s.songTitle}>{song.title}</Text>
                {song.artist ? <Text style={s.artist}>{song.artist}</Text> : null}
              </View>
              {song.keyLabel ? <Text style={s.keyBadge}>{song.keyLabel}</Text> : null}
            </View>

            {song.sections.length === 0 ? (
              <Text style={s.empty}>No lyrics selected</Text>
            ) : opts.columns === 2 ? (
              <View style={s.cols}>
                <View style={s.col}>{song.columns[0].map((sec, j) => <Section key={j} sec={sec} opts={opts} s={s} />)}</View>
                <View style={s.colGap} />
                <View style={s.col}>{song.columns[1].map((sec, j) => <Section key={j} sec={sec} opts={opts} s={s} />)}</View>
              </View>
            ) : (
              song.sections.map((sec, j) => <Section key={j} sec={sec} opts={opts} s={s} />)
            )}
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text>{model.title}  ·  SongSaver  ·  {printed}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function generateServicePdf(model: PdfModel, opts: PdfOptions): Promise<Blob> {
  return pdf(<ServiceDocument model={model} opts={opts} />).toBlob()
}
