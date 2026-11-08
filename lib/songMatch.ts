/**
 * Fuzzy title matching for duplicate detection. Worship songs in Indian
 * languages are often typed in Latin letters with different spellings
 * ("Neengippoyente" / "Ningipoyente", "Sthuthi" / "Stuti"), so titles are
 * reduced to a rough phonetic key before comparing.
 */

/** Lowercase, strip accents/punctuation, and fold common transliteration variants. */
export function titleKey(title: string): string {
  let s = title
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')          // "(Old)", "[Live]"
    .replace(/[^a-z0-9\s]/g, ' ')
  s = s
    .replace(/\b(the|a|an|o)\b/g, ' ')          // filler words
    .replace(/th/g, 't').replace(/dh/g, 'd').replace(/bh/g, 'b').replace(/ph/g, 'f')
    .replace(/kh/g, 'k').replace(/gh/g, 'g').replace(/ch/g, 'c').replace(/sh/g, 's').replace(/zh/g, 'l')
    .replace(/w/g, 'v').replace(/z/g, 's').replace(/q/g, 'k').replace(/x/g, 'ks')
    .replace(/ee|ii/g, 'i').replace(/oo|uu/g, 'u').replace(/aa/g, 'a').replace(/ai/g, 'e').replace(/ou|au/g, 'u')
    .replace(/y/g, 'i')
    .replace(/([a-z])\1+/g, '$1')               // collapse doubled letters
    .replace(/\s+/g, '')
  return s
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/** 0–1 similarity between two titles' phonetic keys. */
export function titleSimilarity(a: string, b: string): number {
  const ka = titleKey(a).slice(0, 40), kb = titleKey(b).slice(0, 40)
  if (!ka || !kb) return 0
  if (ka === kb) return 1
  // One title contained in the other ("Holy Spirit" vs "Holy Spirit You Are Welcome Here")
  const [short, long] = ka.length <= kb.length ? [ka, kb] : [kb, ka]
  if (short.length >= 8 && long.startsWith(short)) return 0.9
  return 1 - levenshtein(ka, kb) / Math.max(ka.length, kb.length)
}

export const DUPLICATE_THRESHOLD = 0.82

/** Songs whose titles look like `title`, best match first. */
export function findSimilar<T extends { id: string; title: string }>(title: string, songs: T[], excludeId?: string, limit = 5): (T & { score: number })[] {
  if (titleKey(title).length < 4) return []
  return songs
    .filter((s) => s.id !== excludeId)
    .map((s) => ({ ...s, score: titleSimilarity(title, s.title) }))
    .filter((s) => s.score >= DUPLICATE_THRESHOLD)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
}

/** Groups of likely-duplicate songs across a whole library. */
export function duplicateGroups<T extends { id: string; title: string }>(songs: T[]): T[][] {
  const keys = songs.map((s) => ({ s, k: titleKey(s.title).slice(0, 40) })).filter((x) => x.k.length >= 4)
  const parent = new Map<string, string>()
  const find = (id: string): string => { const p = parent.get(id) ?? id; if (p === id) return id; const r = find(p); parent.set(id, r); return r }
  // Bucket by first 3 key characters to keep this fast on large libraries
  const buckets = new Map<string, typeof keys>()
  for (const x of keys) { const b = x.k.slice(0, 3); (buckets.get(b) ?? buckets.set(b, []).get(b)!).push(x) }
  for (const group of buckets.values()) {
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const { s: a, k: ka } = group[i], { s: b, k: kb } = group[j]
      const score = ka === kb ? 1 : 1 - levenshtein(ka, kb) / Math.max(ka.length, kb.length)
      if (score >= DUPLICATE_THRESHOLD) parent.set(find(a.id), find(b.id))
    }
  }
  const groups = new Map<string, T[]>()
  for (const { s } of keys) { const r = find(s.id); (groups.get(r) ?? groups.set(r, []).get(r)!).push(s) }
  return [...groups.values()].filter((g) => g.length > 1).sort((a, b) => a[0].title.localeCompare(b[0].title))
}
