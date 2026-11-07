/**
 * Shared model for the service PDF / print sheet. The on-screen preview and
 * the downloadable PDF are both rendered from `buildPdfModel`, so they always
 * match.
 */
import { parseLyrics } from '@/lib/parseLyrics'
import { SERVICE_TYPES, formatKey } from '@/types/database'

export interface PdfSourceSong {
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

export interface PdfSourceService {
  date: string
  type: string
  theme: string | null
  notes: string | null
}

export type PdfFontSize = 'sm' | 'md' | 'lg'

export interface PdfOptions {
  showKeys: boolean
  showArtist: boolean
  showSectionLabels: boolean
  showTranslation: boolean
  showNotes: boolean
  /** Print a repeated chorus once; later repeats become a "Chorus (repeat)" cue */
  collapseRepeats: boolean
  fontSize: PdfFontSize
  columns: 1 | 2
  songPerPage: boolean
}

export const DEFAULT_PDF_OPTIONS: PdfOptions = {
  showKeys: true,
  showArtist: true,
  showSectionLabels: true,
  showTranslation: true,
  showNotes: true,
  collapseRepeats: false,
  fontSize: 'md',
  columns: 1,
  songPerPage: false,
}

/** Base lyric size in points per option, used by both renderers. */
export const PDF_FONT_PT: Record<PdfFontSize, number> = { sm: 9.5, md: 11, lg: 13 }

/** One section of a song as offered in the "choose parts" list. */
export interface SongPart {
  label: string | null
  text: string
  /** First line, for the picker */
  preview: string
}

export interface PdfSection {
  label: string | null
  text: string
  translation: string
  /** Set when collapsed: this section repeats an earlier one */
  repeatOf: string | null
}

export interface PdfSongModel {
  number: number
  title: string
  artist: string | null
  keyLabel: string | null
  sections: PdfSection[]
  /** Sections split into two balanced columns (when options.columns === 2) */
  columns: [PdfSection[], PdfSection[]]
}

export interface PdfModel {
  title: string
  subtitle: string
  notes: string | null
  songs: PdfSongModel[]
}

const norm = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase()
const nameKey = (l: string) => l.toLowerCase().replace(/[^a-z0-9]/g, '')
const baseKey = (l: string) => nameKey(l).replace(/\d+$/, '')

function lyricsOf(song: PdfSourceSong['songs']) {
  const primary = song.song_lyrics?.find((l) => l.is_default) ?? song.song_lyrics?.[0] ?? null
  const secondary = song.song_lyrics?.find((l) => l !== primary) ?? null
  return { primary, secondary }
}

/** The parts of a song offered for selection (in order). */
export function songParts(song: PdfSourceSong['songs']): SongPart[] {
  const { primary } = lyricsOf(song)
  if (!primary) return []
  return parseLyrics(primary.lyrics).map((s) => ({
    label: s.label,
    text: s.content,
    preview: s.content.split('\n').find((l) => l.trim())?.trim() ?? '',
  }))
}

export function formatServiceDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

/** Split sections into two columns with roughly equal line counts, keeping order. */
function balanceColumns(sections: PdfSection[]): [PdfSection[], PdfSection[]] {
  const weight = (s: PdfSection) =>
    (s.repeatOf ? 1 : s.text.split('\n').length + (s.translation ? s.translation.split('\n').length : 0)) + 1.5
  const total = sections.reduce((n, s) => n + weight(s), 0)
  const left: PdfSection[] = []
  let acc = 0
  let i = 0
  for (; i < sections.length; i++) {
    if (left.length > 0 && acc + weight(sections[i]) / 2 > total / 2) break
    left.push(sections[i])
    acc += weight(sections[i])
  }
  return [left, sections.slice(i)]
}

/**
 * Build the printable document.
 * `excluded` holds `${songIndex}` (whole song) and `${songIndex}:${partIndex}` keys.
 */
export function buildPdfModel(
  service: PdfSourceService,
  songs: PdfSourceSong[],
  userKeys: Record<string, string>,
  options: PdfOptions,
  excluded: Set<string>,
): PdfModel {
  const typeLabel = SERVICE_TYPES[service.type as keyof typeof SERVICE_TYPES] ?? 'Service'
  const out: PdfSongModel[] = []

  songs.forEach((item, songIdx) => {
    if (excluded.has(String(songIdx))) return
    const song = item.songs
    if (!song) return
    const { primary, secondary } = lyricsOf(song)
    const parts = primary ? parseLyrics(primary.lyrics) : []
    const trans = options.showTranslation && secondary ? parseLyrics(secondary.lyrics) : []
    const sameShape = trans.length === parts.length

    // Words of each named section, so "Chorus" with nothing under it can reuse them
    const byName = new Map<string, string>()
    const seenText = new Map<string, string>()
    const sections: PdfSection[] = []

    parts.forEach((p, partIdx) => {
      let text = p.content
      if (p.label && text) {
        if (!byName.has(nameKey(p.label))) byName.set(nameKey(p.label), text)
        if (!byName.has(baseKey(p.label))) byName.set(baseKey(p.label), text)
      }
      const isEmptyRepeat = !text && !!p.label
      if (isEmptyRepeat) text = byName.get(nameKey(p.label!)) ?? byName.get(baseKey(p.label!)) ?? ''

      if (excluded.has(`${songIdx}:${partIdx}`)) return
      if (!text && !isEmptyRepeat) return

      // Translation: same position when both languages have the same sections,
      // otherwise the section with the same name
      const t = sameShape ? trans[partIdx] : trans.find((x) => x.label && p.label && nameKey(x.label) === nameKey(p.label))

      const earlier = text ? seenText.get(norm(text)) : undefined
      if (options.collapseRepeats && (earlier || isEmptyRepeat)) {
        sections.push({ label: p.label, text: '', translation: '', repeatOf: earlier ?? p.label ?? 'previous' })
        return
      }
      if (text && !seenText.has(norm(text))) seenText.set(norm(text), p.label ?? 'previous section')
      sections.push({ label: p.label, text, translation: t?.content ?? '', repeatOf: null })
    })

    const keyLabel = options.showKeys
      ? formatKey(item.key_override ?? userKeys[song.id] ?? song.default_key, song.mode) || null
      : null

    out.push({
      number: songIdx + 1,
      title: song.title,
      artist: options.showArtist ? song.artist : null,
      keyLabel,
      sections,
      columns: options.columns === 2 ? balanceColumns(sections) : [sections, []],
    })
  })

  return {
    title: service.theme || typeLabel,
    subtitle: `${formatServiceDate(service.date)}  ·  ${typeLabel}`,
    notes: options.showNotes ? service.notes : null,
    songs: out,
  }
}
