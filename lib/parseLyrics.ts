export interface LyricsSection {
  label: string | null
  content: string
}

const SECTION_RE = /^\[(.+?)\]\s*$/

/**
 * Parses raw lyrics text into sections.
 * Recognises [Verse 1], [Chorus], [Bridge] etc. as section headers.
 * Falls back to splitting on blank lines if no labels are found.
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
    const match = line.match(SECTION_RE)
    if (match) {
      flush()
      label = match[1]
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

/** Returns true if the raw text contains at least one [Section] label. */
export function hasSectionLabels(raw: string): boolean {
  return raw.split('\n').some((l) => SECTION_RE.test(l.trim()))
}
