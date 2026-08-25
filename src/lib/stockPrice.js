import { parseCsv } from './csv'

// Haalt een indicatieve slotkoers op via Stooq (gratis, geen API-key nodig).
// Werkt niet voor elk symbool/elke beurs — geeft bij twijfel gewoon null terug,
// zodat de gebruiker de koers manueel kan invullen.
export async function fetchStockPrice(symbol) {
  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`
    const response = await fetch(url)
    if (!response.ok) return null

    const text = await response.text()
    const rows = parseCsv(text)
    if (rows.length < 2) return null

    const header = rows[0].map((h) => h.trim().toLowerCase())
    const closeIdx = header.indexOf('close')
    if (closeIdx === -1) return null

    const price = Number(rows[1][closeIdx])
    if (!price || Number.isNaN(price)) return null

    return price
  } catch {
    return null
  }
}
