import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { loadCache, saveCache } from '../lib/offlineCache'
import { fetchPrice } from '../lib/twelveData'

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function useInvestments() {
  const [investments, setInvestments] = useState(() => loadCache('investments') || [])
  const [loading, setLoading] = useState(true)
  const [refreshingPrices, setRefreshingPrices] = useState(false)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .order('created_at')
    if (!error) {
      setInvestments(data)
      saveCache('investments', data)
    } else {
      const cached = loadCache('investments')
      if (cached) setInvestments(cached)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addInvestment({ symbol, name, quantity, purchasePrice, purchaseDate }) {
    const { error } = await supabase.from('investments').insert({
      symbol: symbol.toUpperCase(),
      name: name || null,
      quantity,
      purchase_price: purchasePrice,
      purchase_date: purchaseDate,
    })
    if (!error) await refresh()
    return { error }
  }

  async function updateInvestment(id, fields) {
    const { error } = await supabase.from('investments').update(fields).eq('id', id)
    if (!error) await refresh()
    return { error }
  }

  async function deleteInvestment(id) {
    const { error } = await supabase.from('investments').delete().eq('id', id)
    if (!error) await refresh()
    return { error }
  }

  async function setManualPrice(id, price) {
    return updateInvestment(id, {
      current_price: price,
      current_price_updated_at: new Date().toISOString(),
    })
  }

  async function refreshAllPrices(apiKey) {
    if (!apiKey) return { updated: 0, failed: 0, noKey: true }

    setRefreshingPrices(true)
    let updated = 0
    let failed = 0
    for (let i = 0; i < investments.length; i += 1) {
      const inv = investments[i]
      const price = await fetchPrice(inv.symbol, apiKey)
      if (price) {
        await supabase
          .from('investments')
          .update({ current_price: price, current_price_updated_at: new Date().toISOString() })
          .eq('id', inv.id)
        updated += 1
      } else {
        failed += 1
      }
      if (i < investments.length - 1) await wait(8000)
    }
    await refresh()
    setRefreshingPrices(false)
    return { updated, failed, noKey: false }
  }

  return {
    investments,
    loading,
    refreshingPrices,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    setManualPrice,
    refreshAllPrices,
  }
}
