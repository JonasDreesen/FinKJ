const BASE = 'https://api.twelvedata.com'

function validKey(apiKey) {
  return typeof apiKey === 'string' && /^[A-Za-z0-9]{16,64}$/.test(apiKey)
}

async function get(path, params, apiKey) {
  const url = new URL(path, BASE)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('apikey', apiKey)
  const response = await fetch(url, { referrerPolicy: 'no-referrer', credentials: 'omit' })
  if (!response.ok) throw new Error(`Twelve Data: HTTP ${response.status}`)
  return response.json()
}

export async function searchSymbols(query, apiKey) {
  if (!validKey(apiKey) || !query || query.trim().length < 2) return []
  try {
    const data = await get('/symbol_search', { symbol: query.trim(), outputsize: '10' }, apiKey)
    if (!Array.isArray(data?.data)) return []
    return data.data.slice(0, 10).map((item) => ({
      symbol: item.symbol,
      name: item.instrument_name,
      exchange: item.exchange,
      currency: item.currency,
    }))
  } catch {
    return []
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Gratis abonnement: 8 opvragingen per minuut. We vragen tot 8 koersen in één
// keer op en wachten pas daarna een minuut voor de volgende reeks.
export async function fetchPrices(symbols, apiKey, onProgress) {
  if (!validKey(apiKey)) throw new Error('Ongeldige API-sleutel')
  const unique = [...new Set(symbols)]
  const result = {}
  for (let i = 0; i < unique.length; i += 8) {
    if (i > 0) {
      onProgress?.({ waiting: true, done: i, total: unique.length })
      await wait(61_000)
    }
    const batch = unique.slice(i, i + 8)
    const data = await get('/price', { symbol: batch.join(',') }, apiKey)
    if (data?.status === 'error') throw new Error(data.message || 'Twelve Data-fout')
    if (batch.length === 1) {
      result[batch[0]] = Number(data?.price) || null
    } else {
      for (const symbol of batch) result[symbol] = Number(data?.[symbol]?.price) || null
    }
    onProgress?.({ waiting: false, done: Math.min(i + 8, unique.length), total: unique.length })
  }
  return result
}

export { validKey as isValidApiKey }
