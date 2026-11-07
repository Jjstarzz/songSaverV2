/**
 * Tiny in-memory cache for list data (songs, services) shared across pages.
 *
 * Lets a page render the last-known list instantly on navigation while a
 * fresh copy loads in the background (stale-while-revalidate). Lives for the
 * lifetime of the tab; cleared when the signed-in user changes.
 */
type Listener = () => void

const store = new Map<string, unknown>()
const listeners = new Set<Listener>()

export function getCached<T>(key: string): T | undefined {
  return store.get(key) as T | undefined
}

export function setCached<T>(key: string, value: T) {
  store.set(key, value)
}

export function clearListCache() {
  store.clear()
  listeners.forEach((l) => l())
}

/** Subscribe to cache clears (e.g. on sign-out). Returns an unsubscribe fn. */
export function onCacheClear(listener: Listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
