import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { loadCache, saveCache } from '../lib/offlineCache'

export function useSavingsGoals() {
  const [goals, setGoals] = useState(() => loadCache('savings_goals') || [])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .order('created_at')
    if (!error) {
      setGoals(data)
      saveCache('savings_goals', data)
    } else {
      const cached = loadCache('savings_goals')
      if (cached) setGoals(cached)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addGoal({ name, targetAmount, isShared, targetDate }) {
    const { error } = await supabase.from('savings_goals').insert({
      name,
      target_amount: targetAmount,
      is_shared: isShared,
      target_date: targetDate || null,
    })
    if (!error) await refresh()
    return { error }
  }

  async function updateGoalAmount(id, currentAmount) {
    const { error } = await supabase
      .from('savings_goals')
      .update({ current_amount: currentAmount })
      .eq('id', id)
    if (!error) await refresh()
    return { error }
  }

  async function deleteGoal(id) {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (!error) await refresh()
    return { error }
  }

  return { goals, loading, addGoal, updateGoalAmount, deleteGoal }
}
