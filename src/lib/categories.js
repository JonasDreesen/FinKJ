export const CATEGORY_COLORS = [
  '#533afd',
  '#0ea5e9',
  '#10b981',
  '#84cc16',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#a855f7',
  '#14b8a6',
  '#64748b',
  '#a16207',
]

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function categoryColor(category) {
  if (!category) return '#94a3b8'
  if (category.color) return category.color
  return CATEGORY_COLORS[hash(category.id || category.name || '') % CATEGORY_COLORS.length]
}

export const UNCATEGORIZED = { id: null, name: 'Zonder categorie', color: '#94a3b8' }

// Stelt een categorie voor op basis van eerdere transacties met een
// gelijkaardige omschrijving (of de winkelnaam van een gescand bonnetje).
export function suggestCategory(text, transactions) {
  const words = normalizeWords(text)
  if (!words.length) return null
  const scores = {}
  for (const t of transactions) {
    if (!t.category_id || !t.description) continue
    const other = normalizeWords(t.description)
    const overlap = words.filter((w) => other.includes(w)).length
    if (overlap) scores[t.category_id] = (scores[t.category_id] || 0) + overlap
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return best ? best[0] : null
}

function normalizeWords(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3)
}
