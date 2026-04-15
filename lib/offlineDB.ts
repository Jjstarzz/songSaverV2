/**
 * IndexedDB wrapper for offline song storage.
 * Stores full song data (including lyrics) so songs can be read without internet.
 */

const DB_NAME = 'songsaver-offline'
const DB_VERSION = 1
const STORE = 'songs'

export interface OfflineSongLyric {
  id: string
  language: string
  lyrics: string
  is_default: boolean
}

export interface OfflineSong {
  id: string
  title: string
  artist: string | null
  default_key: string | null
  preferred_key: string | null
  mode: 'major' | 'minor' | null
  bpm: number | null
  time_signature: string | null
  tags: string[]
  notes: string | null
  youtube_url: string | null
  spotify_url: string | null
  created_at: string
  created_by: string
  song_lyrics: OfflineSongLyric[]
  savedAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveOfflineSong(song: Omit<OfflineSong, 'savedAt'>): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ ...song, savedAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getOfflineSong(id: string): Promise<OfflineSong | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function getAllOfflineSongs(): Promise<OfflineSong[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result ?? [])
    req.onerror = () => reject(req.error)
  })
}

export async function removeOfflineSong(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function isOfflineSaved(id: string): Promise<boolean> {
  const song = await getOfflineSong(id)
  return !!song
}
