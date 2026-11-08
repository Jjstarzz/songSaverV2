import { LANGUAGE_NAMES } from '@/types/database'

/** Languages normally written in their own (non-Latin) script */
const NATIVE_SCRIPT: Record<string, RegExp> = {
  ml: /[ഀ-ൿ]/, // Malayalam
  ta: /[஀-௿]/, // Tamil
  hi: /[ऀ-ॿ]/, // Devanagari
  te: /[ఀ-౿]/, // Telugu
  ko: /[가-힯]/,
  ja: /[぀-ヿ一-鿿]/,
  zh: /[一-鿿]/,
}

const ENGLISH_WORDS = new Set(['the', 'and', 'you', 'your', 'is', 'my', 'of', 'to', 'in', 'lord', 'god', 'i', 'me', 'we', 'will', 'are', 'for', 'be', 'his', 'all', 'a', 'love', 'jesus', 'praise', 'holy'])

function looksEnglish(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? []
  if (words.length < 8) return true // too short to tell — don't second-guess the label
  const hits = words.filter((w) => ENGLISH_WORDS.has(w)).length
  return hits / words.length >= 0.08
}

export type LyricsKind = 'original' | 'translation' | 'transliteration' | null

export interface LyricsDescription {
  /** e.g. "Malayalam", "Malayalam (Latin script)" */
  name: string
  kind: LyricsKind
  /** BCP-47 tag for the `lang` attribute (affects fonts, line breaking, screen readers) */
  langAttr: string
}

/**
 * Describe a lyrics version as precisely as the data allows. The database only
 * stores a language code, so "transliteration" is inferred from the script
 * actually used, and "original"/"translation" from the song's original language.
 */
export function describeLyrics(language: string, text: string, originalLanguage: string | null | undefined): LyricsDescription {
  const base = LANGUAGE_NAMES[language] ?? language.toUpperCase()
  const native = NATIVE_SCRIPT[language]
  const origNative = originalLanguage ? NATIVE_SCRIPT[originalLanguage] : undefined

  // A non-Latin-script language written in Latin letters
  if (native && !native.test(text)) {
    return { name: `${base} (Latin script)`, kind: 'transliteration', langAttr: `${language}-Latn` }
  }
  // "English" text that is really the original song in Latin letters
  if (language === 'en' && originalLanguage && origNative && !looksEnglish(text)) {
    const origName = LANGUAGE_NAMES[originalLanguage] ?? originalLanguage
    return { name: `${origName} (Latin script)`, kind: 'transliteration', langAttr: `${originalLanguage}-Latn` }
  }
  if (originalLanguage) {
    return { name: base, kind: language === originalLanguage ? 'original' : 'translation', langAttr: language }
  }
  return { name: base, kind: null, langAttr: language }
}

export const KIND_LABEL: Record<Exclude<LyricsKind, null>, string> = {
  original: 'Original',
  translation: 'Translation',
  transliteration: 'Transliteration',
}
