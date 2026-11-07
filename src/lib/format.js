const formatters = new Map()

function formatterFor(currency, compact) {
  const key = `${currency}|${compact}`
  if (!formatters.has(key)) {
    let fmt
    try {
      fmt = new Intl.NumberFormat('nl-BE', {
        style: 'currency',
        currency,
        ...(compact ? { maximumFractionDigits: 0 } : {}),
      })
    } catch {
      fmt = new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' })
    }
    formatters.set(key, fmt)
  }
  return formatters.get(key)
}

export function formatMoney(amount, { currency = 'EUR', sign = false, compact = false } = {}) {
  const value = Number(amount) || 0
  const text = formatterFor(currency, compact).format(Math.abs(value))
  if (value < 0) return `−${text}`
  if (sign && value > 0) return `+${text}`
  return text
}

export function formatPercent(value, digits = 0) {
  if (!Number.isFinite(value)) return '–'
  return `${value.toFixed(digits).replace('.', ',')}%`
}

export function parseAmount(input) {
  if (typeof input === 'number') return input
  const cleaned = String(input ?? '')
    .trim()
    .replace(/[€\s]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
  const value = Number(cleaned)
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : NaN
}

export function sum(rows, pick = (r) => r) {
  return rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0)
}
