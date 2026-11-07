import { useCallback, useEffect, useSyncExternalStore } from 'react'

// Kleine data-laag: gedeelde cache per query, ontdubbelde verzoeken, en
// "invalidate" zodat een wijziging op één scherm alle andere schermen ververst.
// De cache in localStorage is per gebruiker en wordt gewist bij uitloggen.

const CACHE_PREFIX = 'finkj:cache:'
let cacheUser = null

const entries = new Map() // key -> { data, error, loading, fetcher, tags, promise }
const subscribers = new Map() // key -> Set<fn>

function storageKey(key) {
  return `${CACHE_PREFIX}${cacheUser}:${key}`
}

function readPersisted(key) {
  if (!cacheUser) return undefined
  try {
    const raw = localStorage.getItem(storageKey(key))
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

function writePersisted(key, data) {
  if (!cacheUser) return
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(data))
  } catch {
    // Opslag vol of geblokkeerd: de cache is enkel een extraatje.
  }
}

export function setCacheUser(userId) {
  if (cacheUser !== userId) {
    entries.clear()
    cacheUser = userId
  }
}

export function clearAllCaches() {
  entries.clear()
  cacheUser = null
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX) || k.startsWith('cache:'))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    // negeren
  }
}

function getEntry(key) {
  if (!entries.has(key)) {
    const persisted = readPersisted(key)
    entries.set(key, {
      data: persisted,
      error: null,
      loading: persisted === undefined,
      stale: true,
      snapshot: null,
    })
  }
  return entries.get(key)
}

function emit(key) {
  const entry = entries.get(key)
  if (entry) entry.snapshot = null
  subscribers.get(key)?.forEach((fn) => fn())
}

async function run(key) {
  const entry = getEntry(key)
  if (!entry.fetcher) return
  if (entry.promise) return entry.promise
  entry.promise = (async () => {
    try {
      const data = await entry.fetcher()
      entry.data = data
      entry.error = null
      writePersisted(key, data)
    } catch (error) {
      entry.error = error
    } finally {
      entry.loading = false
      entry.stale = false
      entry.promise = null
      emit(key)
    }
  })()
  emit(key)
  return entry.promise
}

export function invalidate(...tags) {
  for (const [key, entry] of entries) {
    if (tags.includes('*') || entry.tags?.some((t) => tags.includes(t))) {
      entry.stale = true
      if (subscribers.get(key)?.size) run(key)
    }
  }
}

export function useQuery(key, fetcher, { tags = [], enabled = true } = {}) {
  const entry = getEntry(key)
  entry.fetcher = fetcher
  entry.tags = tags

  const subscribe = useCallback(
    (fn) => {
      if (!subscribers.has(key)) subscribers.set(key, new Set())
      subscribers.get(key).add(fn)
      return () => subscribers.get(key)?.delete(fn)
    },
    [key],
  )

  const getSnapshot = useCallback(() => {
    const e = getEntry(key)
    if (!e.snapshot) e.snapshot = { data: e.data, error: e.error, loading: e.loading }
    return e.snapshot
  }, [key])

  const state = useSyncExternalStore(subscribe, getSnapshot)

  useEffect(() => {
    if (enabled && getEntry(key).stale) run(key)
  }, [key, enabled])

  const refresh = useCallback(() => run(key), [key])
  return { ...state, refresh }
}

// Ververs alles wanneer de app terug in beeld komt (bv. telefoon ontgrendeld),
// zodat je de wijzigingen van je partner ziet.
let lastFocusRefresh = Date.now()
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastFocusRefresh > 30_000) {
      lastFocusRefresh = Date.now()
      invalidate('*')
    }
  })
  window.addEventListener('online', () => invalidate('*'))
}
