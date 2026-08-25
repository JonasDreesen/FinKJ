export async function searchSymbols(query, apiKey) {
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

export async function fetchPrice(symbol, apiKey) {
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
