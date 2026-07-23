import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { toMonthKey, shiftMonth, monthRange } from '../lib/month'

function bucketKey(categoryId, isShared, userId, monthKey) {
  return `${categoryId}|${isShared}|${isShared ? '' : userId}|${monthKey}`
}

export function useBudgets(monthDate) {
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const monthKey = toMonthKey(monthDate)

  const refresh = useCallback(async () => {
    setLoading(true)
    const prevDate = shiftMonth(monthDate, -1)
    const prevMonthKey = toMonthKey(prevDate)

    const { data: budgetRows } = await supabase
      .from('budgets')
      .select('*, category:categories(id, name, color)')
      .in('month', [monthKey, prevMonthKey])

    const currentRange = monthRange(monthDate)
    const prevRange = monthRange(prevDate)

    const { data: txRows } = await supabase
      .from('transactions')
      .select('category_id, is_shared, user_id, amount, occurred_on')
      .eq('type', 'expense')
      .eq('is_recurring', false)
      .gte('occurred_on', prevRange.start)
      .lt('occurred_on', currentRange.end)

    const spentByBucket = {}
    for (const tx of txRows || []) {
      const bucketMonth = tx.occurred_on < currentRange.start ? prevMonthKey : monthKey
      const key = bucketKey(tx.category_id, tx.is_shared, tx.user_id, bucketMonth)
      spentByBucket[key] = (spentByBucket[key] || 0) + Number(tx.amount)
    }

    const currentRows = (budgetRows || []).filter((b) => b.month === monthKey)
    const prevRows = (budgetRows || []).filter((b) => b.month === prevMonthKey)

    const result = currentRows.map((row) => {
      const prevRow = prevRows.find(
        (p) =>
          p.category_id === row.category_id &&
          p.is_shared === row.is_shared &&
          p.user_id === row.user_id,
      )
      const spent = spentByBucket[bucketKey(row.category_id, row.is_shared, row.user_id, monthKey)] || 0
      const prevSpent = prevRow
        ? spentByBucket[
            bucketKey(prevRow.category_id, prevRow.is_shared, prevRow.user_id, prevMonthKey)
          ] || 0
        : 0
      const rolloverAmount = prevRow?.rollover ? Number(prevRow.amount) - prevSpent : 0
      const effectiveBudget = Number(row.amount) + rolloverAmount

      return {
        ...row,
        spent,
        rolloverAmount,
        effectiveBudget,
        leftover: effectiveBudget - spent,
        percent: effectiveBudget > 0 ? (spent / effectiveBudget) * 100 : spent > 0 ? 100 : 0,
      }
    })

    setLines(result)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addBudget({ categoryId, isShared, amount, rollover }) {
    const { error } = await supabase.from('budgets').insert({
      category_id: categoryId,
      is_shared: isShared,
      amount,
      rollover,
      month: monthKey,
    })
    if (!error) await refresh()
    return { error }
  }

  async function updateBudget(id, fields) {
    const { error } = await supabase.from('budgets').update(fields).eq('id', id)
    if (!error) await refresh()
    return { error }
  }

  async function deleteBudget(id) {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (!error) await refresh()
    return { error }
  }

  return { lines, loading, addBudget, updateBudget, deleteBudget, refresh }
}
