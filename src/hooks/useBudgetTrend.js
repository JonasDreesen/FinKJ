import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { loadCache, saveCache } from '../lib/offlineCache'
import { monthRange, toMonthKey, trailingMonths, formatMonthLabel } from '../lib/month'

export function useBudgetTrend(months = 6) {
  const [data, setData] = useState(() => loadCache(`budget_trend:${months}`) || [])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const monthDates = trailingMonths(months)
    const monthKeys = monthDates.map(toMonthKey)
    const overallStart = monthRange(monthDates[0]).start
    const overallEnd = monthRange(monthDates[monthDates.length - 1]).end

    const { data: budgetRows, error: budgetError } = await supabase
      .from('budgets')
      .select('month, amount')
      .in('month', monthKeys)

    const { data: txRows, error: txError } = await supabase
      .from('transactions')
      .select('amount, occurred_on')
      .eq('type', 'expense')
      .eq('is_recurring', false)
      .gte('occurred_on', overallStart)
      .lt('occurred_on', overallEnd)

    if (budgetError || txError) {
      const cached = loadCache(`budget_trend:${months}`)
      if (cached) setData(cached)
      setLoading(false)
      return
    }

    const budgetByMonth = {}
    for (const row of budgetRows || []) {
      budgetByMonth[row.month] = (budgetByMonth[row.month] || 0) + Number(row.amount)
    }

    const spentByMonth = {}
    for (const tx of txRows || []) {
      const key = `${tx.occurred_on.slice(0, 7)}-01`
      spentByMonth[key] = (spentByMonth[key] || 0) + Number(tx.amount)
    }

    const result = monthDates.map((date, i) => ({
      month: monthKeys[i],
      label: formatMonthLabel(date),
      budget: budgetByMonth[monthKeys[i]] || 0,
      spent: spentByMonth[monthKeys[i]] || 0,
    }))

    setData(result)
    saveCache(`budget_trend:${months}`, result)
    setLoading(false)
  }, [months])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, refresh }
}
