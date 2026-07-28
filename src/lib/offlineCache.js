export function loadCache(key) {
  try {
    const raw = localStorage.getItem(`cache:${key}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveCache(key, data) {
  try {
    localStorage.setItem(`cache:${key}`, JSON.stringify(data))
  } catch {
    // Opslag vol of niet beschikbaar — caching is best-effort, negeren.
  }
}
