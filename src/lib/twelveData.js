const STORAGE_KEY = 'twelvedata_api_key'

export function getApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function setApiKey(key) {
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage niet beschikbaar — negeren.
  }
}

export async function searchSymbols(query) {
  const apiKey = getApiKey()
  if (!apiKey || !query || query.trim().length < 2) return []

  try {
    const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()
    if (!Array.isArray(data?.data)) return []
    return data.data.slice(0, 8).map((item) => ({
      symbol: item.symbol,
      name: item.instrument_name,
      exchange: item.exchange,
      currency: item.currency,
    }))
  } catch {
    return []
  }
}

export async function fetchPrice(symbol) {
  const apiKey = getApiKey()
  if (!apiKey) return null

  try {
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()
    const price = Number(data?.price)
    if (!price || Number.isNaN(price)) return null
    return price
  } catch {
    return null
  }
}
