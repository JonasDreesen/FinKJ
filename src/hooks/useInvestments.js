import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { loadCache, saveCache } from '../lib/offlineCache'

export function useInvestments() {
  const [investments, setInvestments] = useState(() => loadCache('investments') || [])
  const [loading, setLoading] = useState(true)

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

  return {
    investments,
    loading,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    setManualPrice,
  }
}
