import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { monthRange, monthKeyOf, trailingMonths, toMonthKey } from '../lib/month'

export function useDashboardData({ range, scopeFilter, categoryId }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const trend = trailingMonths(12, range.referenceDate)
  const trendStart = monthRange(trend[0]).start

  const fetchStart = trendStart < range.start ? trendStart : range.start
  const fetchEnd = range.end

  const refresh = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('transactions')
      .select('id, type, amount, is_shared, occurred_on, category_id, category:categories(id, name, color)')
      .eq('is_recurring', false)
      .gte('occurred_on', fetchStart)
      .lt('occurred_on', fetchEnd)

    if (scopeFilter === 'personal') query = query.eq('is_shared', false)
    if (scopeFilter === 'shared') query = query.eq('is_shared', true)
    if (categoryId) query = query.eq('category_id', categoryId)

    const { data, error } = await query
    if (!error) setTransactions(data)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStart, fetchEnd, scopeFilter, categoryId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const periodTx = transactions.filter((t) => t.occurred_on >= range.start && t.occurred_on < range.end)

  const totalIncome = periodTx.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpense = periodTx.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)

  const byCategoryMap = {}
  for (const t of periodTx) {
    if (t.type !== 'expense') continue
    const name = t.category?.name || 'Zonder categorie'
    byCategoryMap[name] = (byCategoryMap[name] || 0) + Number(t.amount)
  }
  const byCategory = Object.entries(byCategoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const trendMap = {}
  for (const month of trend) {
    trendMap[toMonthKey(month)] = { month, income: 0, expense: 0 }
  }
  for (const t of transactions) {
    const key = monthKeyOf(t.occurred_on) + '-01'
    if (!trendMap[key]) continue
    if (t.type === 'income') trendMap[key].income += Number(t.amount)
    else trendMap[key].expense += Number(t.amount)
  }
  const trendData = trend.map((month) => {
    const key = toMonthKey(month)
    return {
      label: month.toLocaleDateString('nl-BE', { month: 'short', year: '2-digit' }),
      inkomsten: Math.round(trendMap[key].income * 100) / 100,
      uitgaven: Math.round(trendMap[key].expense * 100) / 100,
    }
  })

  return {
    loading,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    byCategory,
    trendData,
  }
}
