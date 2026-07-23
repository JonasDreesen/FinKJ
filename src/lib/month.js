export function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function toMonthKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export function shiftMonth(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function monthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return { start: toDateKey(start), end: toDateKey(end) }
}

function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatMonthLabel(date) {
  return date.toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' })
}

export function yearStart(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1)
}

export function shiftYear(date, delta) {
  return new Date(date.getFullYear() + delta, date.getMonth(), 1)
}

export function yearRange(date) {
  const start = new Date(date.getFullYear(), 0, 1)
  const end = new Date(date.getFullYear() + 1, 0, 1)
  return { start: toDateKey(start), end: toDateKey(end) }
}

export function formatYearLabel(date) {
  return String(date.getFullYear())
}

export function monthKeyOf(dateString) {
  return dateString.slice(0, 7)
}

export function trailingMonths(count, endDate = new Date()) {
  const months = []
  for (let i = count - 1; i >= 0; i -= 1) {
    months.push(shiftMonth(monthStart(endDate), -i))
  }
  return months
}
