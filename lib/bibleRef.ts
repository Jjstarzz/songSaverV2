// Maps every common book name / abbreviation → OSIS book ID
const ALIASES: Record<string, string> = {
  // Genesis
  genesis: 'GEN', gen: 'GEN', gn: 'GEN',
  // Exodus
  exodus: 'EXO', exo: 'EXO', ex: 'EXO',
  // Leviticus
  leviticus: 'LEV', lev: 'LEV', lv: 'LEV',
  // Numbers
  numbers: 'NUM', num: 'NUM', nm: 'NUM',
  // Deuteronomy
  deuteronomy: 'DEU', deu: 'DEU', deut: 'DEU', dt: 'DEU',
  // Joshua
  joshua: 'JOS', jos: 'JOS', josh: 'JOS',
  // Judges
  judges: 'JDG', jdg: 'JDG', judg: 'JDG',
  // Ruth
  ruth: 'RUT', rut: 'RUT',
  // Samuel
  '1 samuel': '1SA', '1samuel': '1SA', '1 sam': '1SA', '1sam': '1SA', '1sa': '1SA',
  '2 samuel': '2SA', '2samuel': '2SA', '2 sam': '2SA', '2sam': '2SA', '2sa': '2SA',
  // Kings
  '1 kings': '1KI', '1kings': '1KI', '1 kgs': '1KI', '1kgs': '1KI', '1ki': '1KI',
  '2 kings': '2KI', '2kings': '2KI', '2 kgs': '2KI', '2kgs': '2KI', '2ki': '2KI',
  // Chronicles
  '1 chronicles': '1CH', '1chronicles': '1CH', '1 chr': '1CH', '1chr': '1CH', '1 chron': '1CH', '1chron': '1CH', '1ch': '1CH',
  '2 chronicles': '2CH', '2chronicles': '2CH', '2 chr': '2CH', '2chr': '2CH', '2 chron': '2CH', '2chron': '2CH', '2ch': '2CH',
  // Ezra / Nehemiah / Esther
  ezra: 'EZR', ezr: 'EZR',
  nehemiah: 'NEH', neh: 'NEH',
  esther: 'EST', est: 'EST', esth: 'EST',
  // Job
  job: 'JOB',
  // Psalms
  psalms: 'PSA', psalm: 'PSA', psa: 'PSA', ps: 'PSA', pss: 'PSA',
  // Proverbs
  proverbs: 'PRO', pro: 'PRO', prov: 'PRO', prv: 'PRO',
  // Ecclesiastes
  ecclesiastes: 'ECC', ecc: 'ECC', eccl: 'ECC', qoh: 'ECC',
  // Song of Solomon
  'song of solomon': 'SNG', 'song of songs': 'SNG', 'song': 'SNG', sos: 'SNG', sng: 'SNG', canticles: 'SNG',
  // Isaiah
  isaiah: 'ISA', isa: 'ISA',
  // Jeremiah
  jeremiah: 'JER', jer: 'JER',
  // Lamentations
  lamentations: 'LAM', lam: 'LAM',
  // Ezekiel
  ezekiel: 'EZK', ezk: 'EZK', ezek: 'EZK', eze: 'EZK',
  // Daniel
  daniel: 'DAN', dan: 'DAN', dn: 'DAN',
  // Minor prophets
  hosea: 'HOS', hos: 'HOS',
  joel: 'JOL', jol: 'JOL', jl: 'JOL',
  amos: 'AMO', amo: 'AMO',
  obadiah: 'OBA', oba: 'OBA', ob: 'OBA',
  jonah: 'JON', jon: 'JON', jnh: 'JON',
  micah: 'MIC', mic: 'MIC',
  nahum: 'NAM', nam: 'NAM', nah: 'NAM',
  habakkuk: 'HAB', hab: 'HAB',
  zephaniah: 'ZEP', zep: 'ZEP', zeph: 'ZEP',
  haggai: 'HAG', hag: 'HAG',
  zechariah: 'ZEC', zec: 'ZEC', zech: 'ZEC',
  malachi: 'MAL', mal: 'MAL',
  // NT
  matthew: 'MAT', mat: 'MAT', matt: 'MAT', mt: 'MAT',
  mark: 'MRK', mrk: 'MRK', mk: 'MRK', mar: 'MRK',
  luke: 'LUK', luk: 'LUK', lk: 'LUK',
  john: 'JHN', jhn: 'JHN', jn: 'JHN', joh: 'JHN',
  acts: 'ACT', act: 'ACT',
  romans: 'ROM', rom: 'ROM',
  '1 corinthians': '1CO', '1corinthians': '1CO', '1 cor': '1CO', '1cor': '1CO', '1co': '1CO',
  '2 corinthians': '2CO', '2corinthians': '2CO', '2 cor': '2CO', '2cor': '2CO', '2co': '2CO',
  galatians: 'GAL', gal: 'GAL',
  ephesians: 'EPH', eph: 'EPH',
  philippians: 'PHP', php: 'PHP', phil: 'PHP',
  colossians: 'COL', col: 'COL',
  '1 thessalonians': '1TH', '1thessalonians': '1TH', '1 thess': '1TH', '1thess': '1TH', '1th': '1TH',
  '2 thessalonians': '2TH', '2thessalonians': '2TH', '2 thess': '2TH', '2thess': '2TH', '2th': '2TH',
  '1 timothy': '1TI', '1timothy': '1TI', '1 tim': '1TI', '1tim': '1TI', '1ti': '1TI',
  '2 timothy': '2TI', '2timothy': '2TI', '2 tim': '2TI', '2tim': '2TI', '2ti': '2TI',
  titus: 'TIT', tit: 'TIT',
  philemon: 'PHM', phm: 'PHM', phlm: 'PHM',
  hebrews: 'HEB', heb: 'HEB',
  james: 'JAS', jas: 'JAS', jm: 'JAS',
  '1 peter': '1PE', '1peter': '1PE', '1 pet': '1PE', '1pet': '1PE', '1pe': '1PE',
  '2 peter': '2PE', '2peter': '2PE', '2 pet': '2PE', '2pet': '2PE', '2pe': '2PE',
  '1 john': '1JN', '1john': '1JN', '1jn': '1JN',
  '2 john': '2JN', '2john': '2JN', '2jn': '2JN',
  '3 john': '3JN', '3john': '3JN', '3jn': '3JN',
  jude: 'JUD', jud: 'JUD',
  revelation: 'REV', revelations: 'REV', rev: 'REV', rv: 'REV',
}

// Sorted longest-first so multi-word names like "song of solomon" win over "song"
const SORTED = Object.entries(ALIASES).sort((a, b) => b[0].length - a[0].length)

/**
 * Try to parse a query as a Bible reference.
 * Returns an OSIS passage ID like "JHN.3.16" or null if it looks like a keyword.
 */
export function parseReference(q: string): string | null {
  const s = q.trim().toLowerCase()

  for (const [alias, bookId] of SORTED) {
    if (!s.startsWith(alias)) continue

    const rest = s.slice(alias.length).trim()
    if (!rest) continue // bare book name — no chapter, treat as keyword

    // Must be exactly: chapter  OR  chapter:verse  OR  chapter:verse-verse
    const m = rest.match(/^(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/)
    if (!m) continue

    const ch = m[1]
    const vs = m[2]
    const ve = m[3]

    if (!vs)  return `${bookId}.${ch}`
    if (!ve)  return `${bookId}.${ch}.${vs}`
    return `${bookId}.${ch}.${vs}-${bookId}.${ch}.${ve}`
  }

  return null
}
