import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Simple key suggester based on vocal range
export function suggestKey(
  vocalLow: string,
  vocalHigh: string,
  songKey: string
): string {
  const noteOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

  const noteIndex = (note: string) => noteOrder.indexOf(note.replace('b', '#'))

  const songIdx = noteIndex(songKey)
  if (songIdx === -1) return songKey

  // Heuristic: try to center the song in the user's range
  // Most worship songs span about an octave (12 semitones)
  // Ideal: top note should be ~3/4 up their range
  const lowParts = vocalLow.match(/([A-G]#?)(\d)/)
  const highParts = vocalHigh.match(/([A-G]#?)(\d)/)

  if (!lowParts || !highParts) return songKey

  const lowNote = lowParts[1]
  const highNote = highParts[1]
  const lowOctave = parseInt(lowParts[2])
  const highOctave = parseInt(highParts[2])

  const lowSemitone = noteIndex(lowNote) + lowOctave * 12
  const highSemitone = noteIndex(highNote) + highOctave * 12
  const rangeSemitones = highSemitone - lowSemitone

  // Target: place song top note at 80% of range
  const targetTopSemitone = lowSemitone + Math.round(rangeSemitones * 0.8)
  const songSpan = 10 // assume ~10 semitone song span
  const targetRootSemitone = targetTopSemitone - songSpan

  const targetNoteIdx = ((targetRootSemitone % 12) + 12) % 12
  return noteOrder[targetNoteIdx] || songKey
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
