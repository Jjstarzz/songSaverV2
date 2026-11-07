export interface LyricsSection {
  label: string | null
  content: string
}

/** `[Anything]` on its own line — the app's canonical section marker. */
const BRACKET_RE = /^\s*\[(.+?)\]\s*:?\s*$/

const SECTION_NAMES =
  'pre[\\s-]?chorus|post[\\s-]?chorus|chorus|verse|bridge|refrain|tag|outro|intro|ending|interlude|instrumental|hook|coda|vamp|pallavi|anupallavi|charanam'

/**
 * Plain-text headings as people actually type them:
 *   "Chorus", "VERSE 1:", "Pre Chorus", "Bridge 2", "(Chorus)", "Chorus x2", "V1", "C2"
 */
const PLAIN_HEADING_RE = new RegExp(
  `^\\s*[(]?\\s*((?:${SECTION_NAMES})\\s*\\d*|[vcb]\\s*\\d+)\\s*(?:[(]?\\s*x\\s*\\d+\\s*[)]?)?\\s*[)]?\\s*:?\\s*$`,
  'i',
)

/** "Repeat chorus", "(Repeat Verse 2)" — means "sing that section again". */
const REPEAT_SECTION_RE = new RegExp(`^\\s*[([]?\\s*repeat\\s+(?:the\\s+)?((?:${SECTION_NAMES})\\s*\\d*)\\s*[)\\]]?\\s*:?\\s*$`, 'i')

/** A bare "(Repeat)" / "Repeat x2" instruction — not lyrics. */
const REPEAT_ONLY_RE = /^\s*[([]?\s*repeat\s*(?:x\s*\d+)?\s*[)\]]?\s*:?\s*$/i

/** "VERSE 1:" → "Verse 1", "pre-chorus" → "Pre-Chorus", "v2" → "Verse 2" */
function tidyLabel(raw: string): string {
  let l = raw.toLowerCase().replace(/[()[\]:]/g, ' ').replace(/\s*x\s*\d+\s*$/i, '').replace(/\s+/g, ' ').trim()
  const short = l.match(/^([vcb])\s*(\d+)$/i)
  if (short) l = `${{ v: 'Verse', c: 'Chorus', b: 'Bridge' }[short[1].toLowerCase() as 'v' | 'c' | 'b']} ${short[2]}`
  return l.replace(/\b([a-z])/gi, (m) => m.toUpperCase()).replace(/(\D)(\d)/, (m, a, d) => (a === ' ' ? m : `${a} ${d}`))
}

/** Returns the section label if the line is a heading, otherwise null. */
function headingOf(line: string): string | null {
  const bracket = line.match(BRACKET_RE)
  if (bracket) return bracket[1].trim()
  const plain = line.match(PLAIN_HEADING_RE)
  if (plain) return tidyLabel(plain[0])
  const repeat = line.match(REPEAT_SECTION_RE)
  if (repeat) return tidyLabel(repeat[1])
  return null
}

/**
 * Parses raw lyrics text into sections.
 * Recognises [Verse 1]-style markers and plain headings ("Chorus", "VERSE 2:",
 * "Pre Chorus", "V1"…). Falls back to splitting on blank lines if no headings
 * are found. "(Repeat)" instruction lines are dropped.
 */
export function parseLyrics(raw: string): LyricsSection[] {
  if (!raw.trim()) return []

  const lines = raw.split('\n')
  const sections: LyricsSection[] = []
  let label: string | null = null
  let buffer: string[] = []

  const flush = () => {
    const content = buffer.join('\n').trim()
    if (content || label !== null) sections.push({ label, content })
    buffer = []
    label = null
  }

  for (const line of lines) {
    if (REPEAT_ONLY_RE.test(line)) continue
    const heading = headingOf(line)
    if (heading !== null) {
      flush()
      label = heading
    } else {
      buffer.push(line)
    }
  }
  flush()

  // Fallback: no labels — split by blank lines
  if (sections.length === 1 && sections[0].label === null) {
    const parts = sections[0].content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length > 1) return parts.map((p) => ({ label: null, content: p }))
  }

  return sections
}

/** Normalises parsed sections back to a clean string for storage. */
export function normaliseLyrics(sections: LyricsSection[]): string {
  return sections
    .map((s) => (s.label ? `[${s.label}]\n${s.content}` : s.content))
    .filter(Boolean)
    .join('\n\n')
}

/** Returns true if the raw text contains at least one section heading. */
export function hasSectionLabels(raw: string): boolean {
  return raw.split('\n').some((l) => headingOf(l) !== null)
}

const MAX_SLIDE_LINES = 6

/**
 * Sections → projector slides:
 *  - a heading with nothing under it ("Chorus" again, "Repeat chorus") reuses
 *    the words of the earlier section with that name
 *  - stanzas separated by blank lines become separate slides
 *  - very long stanzas are split into balanced chunks of ≤ 6 lines so the
 *    text stays large enough to read
 * Each slide keeps its section label for the operator; the projector never shows it.
 */
export function toSlides(raw: string): LyricsSection[] {
  const sections = parseLyrics(raw)
  const byName = new Map<string, string>()
  const key = (l: string) => l.toLowerCase().replace(/[^a-z0-9]/g, '')
  const base = (l: string) => key(l).replace(/\d+$/, '')

  const slides: LyricsSection[] = []
  for (const s of sections) {
    let content = s.content
    if (!content && s.label) {
      content = byName.get(key(s.label)) ?? byName.get(base(s.label)) ?? ''
    } else if (content && s.label) {
      if (!byName.has(key(s.label))) byName.set(key(s.label), content)
      if (!byName.has(base(s.label))) byName.set(base(s.label), content)
    }
    if (!content) continue

    for (const stanza of content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) {
      const lines = stanza.split('\n')
      if (lines.length <= MAX_SLIDE_LINES + 2) {
        slides.push({ label: s.label, content: stanza })
        continue
      }
      const chunks = Math.ceil(lines.length / MAX_SLIDE_LINES)
      const size = Math.ceil(lines.length / chunks)
      for (let i = 0; i < lines.length; i += size) {
        slides.push({ label: s.label, content: lines.slice(i, i + size).join('\n') })
      }
    }
  }
  return slides
}
