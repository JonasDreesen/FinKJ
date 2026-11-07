// Alle datums als lokale kalenderdatums ("YYYY-MM-DD"). Nooit toISOString()
// gebruiken: dat rekent in UTC en geeft in België tussen middernacht en 2u
// de datum van gisteren.

const pad = (n) => String(n).padStart(2, '0')

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseISODate(value) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO() {
  return toISODate(new Date())
}

export function addDays(iso, days) {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function shiftMonth(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function monthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`
}

export function monthRange(date) {
  return {
    start: monthKey(date),
    end: monthKey(shiftMonth(date, 1)),
  }
}

export function yearRange(year) {
  return { start: `${year}-01-01`, end: `${year + 1}-01-01` }
}

export function trailingMonths(count, endDate = new Date()) {
  const end = monthStart(endDate)
  return Array.from({ length: count }, (_, i) => shiftMonth(end, i - (count - 1)))
}

export function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function formatMonth(date) {
  return date.toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' })
}

export function formatMonthShort(date) {
  return date.toLocaleDateString('nl-BE', { month: 'short' }).replace('.', '')
}

export function formatDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return ''
  return parseISODate(iso).toLocaleDateString('nl-BE', opts)
}

export function formatDayHeading(iso) {
  const today = todayISO()
  if (iso === today) return 'Vandaag'
  if (iso === addDays(today, -1)) return 'Gisteren'
  if (iso === addDays(today, 1)) return 'Morgen'
  const date = parseISODate(iso)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  const text = date.toLocaleDateString('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function monthsBetween(fromISO, toISO) {
  const a = parseISODate(fromISO)
  const b = parseISODate(toISO)
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

export const INTERVAL_LABELS = { weekly: 'Wekelijks', monthly: 'Maandelijks', yearly: 'Jaarlijks' }
