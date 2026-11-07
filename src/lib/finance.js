import { monthKey, monthRange, shiftMonth, trailingMonths } from './dates'
import { sum } from './format'

export function inRange(t, range) {
  return t.occurred_on >= range.start && t.occurred_on < range.end
}

export function matchesScope(t, scope) {
  if (scope === 'shared') return t.is_shared
  if (scope === 'personal') return !t.is_shared
  return true
}

export function totals(transactions) {
  const income = sum(transactions.filter((t) => t.type === 'income'), (t) => t.amount)
  const expense = sum(transactions.filter((t) => t.type === 'expense'), (t) => t.amount)
  return { income, expense, net: income - expense }
}

export function expensesByCategory(transactions, categoriesById) {
  const map = new Map()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const key = t.category_id || 'none'
    map.set(key, (map.get(key) || 0) + Number(t.amount))
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0)
  return [...map.entries()]
    .map(([id, value]) => ({
      id,
      category: categoriesById.get(id) || null,
      value,
      share: total ? value / total : 0,
    }))
    .sort((a, b) => b.value - a.value)
}

export function monthlyTrend(transactions, months = 6, endDate = new Date()) {
  const list = trailingMonths(months, endDate)
  const buckets = new Map(list.map((d) => [monthKey(d).slice(0, 7), { date: d, income: 0, expense: 0 }]))
  for (const t of transactions) {
    const bucket = buckets.get(t.occurred_on.slice(0, 7))
    if (!bucket) continue
    if (t.type === 'income') bucket.income += Number(t.amount)
    else bucket.expense += Number(t.amount)
  }
  return [...buckets.values()]
}

// Uitgaven die bij een budgetregel horen: zelfde categorie en zelfde scope.
// Gedeeld budget = alle gedeelde uitgaven; persoonlijk = persoonlijke
// uitgaven van de eigenaar van dat budget.
function spentFor(budget, transactions, range) {
  return sum(
    transactions.filter(
      (t) =>
        t.type === 'expense' &&
        t.category_id === budget.category_id &&
        inRange(t, range) &&
        (budget.is_shared ? t.is_shared : !t.is_shared && t.user_id === budget.user_id),
    ),
    (t) => t.amount,
  )
}

export function budgetLines(budgets, transactions, monthDate) {
  const key = monthKey(monthDate)
  const prevDate = shiftMonth(monthDate, -1)
  const prevKey = monthKey(prevDate)
  const range = monthRange(monthDate)
  const prevRange = monthRange(prevDate)

  return budgets
    .filter((b) => b.month === key)
    .map((b) => {
      const prev = budgets.find(
        (p) =>
          p.month === prevKey &&
          p.category_id === b.category_id &&
          p.is_shared === b.is_shared &&
          (b.is_shared || p.user_id === b.user_id),
      )
      let carried = 0
      if (prev?.rollover) {
        const prevSpent = prev.actual_amount != null ? Number(prev.actual_amount) : spentFor(prev, transactions, prevRange)
        carried = Number(prev.amount) - prevSpent
      }
      const tracked = spentFor(b, transactions, range)
      const manual = b.actual_amount != null
      const spent = manual ? Number(b.actual_amount) : tracked
      const available = Number(b.amount) + carried
      return {
        ...b,
        tracked,
        manual,
        spent,
        carried,
        available,
        left: available - spent,
        ratio: available > 0 ? spent / available : spent > 0 ? 1 : 0,
      }
    })
}

export function budgetHealth(ratio) {
  if (ratio >= 1) return 'over'
  if (ratio >= 0.85) return 'warn'
  return 'ok'
}

export function budgetHistory(budgets, transactions, months = 6, endDate = new Date()) {
  return trailingMonths(months, endDate).map((date) => {
    const lines = budgetLines(budgets, transactions, date)
    return {
      date,
      budget: sum(lines, (l) => l.amount),
      spent: sum(lines, (l) => l.spent),
    }
  })
}

// Hoeveel moet je nog per maand sparen om je doel op tijd te halen?
export function goalPlan(goal, today = new Date()) {
  const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount))
  const progress = Number(goal.target_amount) > 0 ? Number(goal.current_amount) / Number(goal.target_amount) : 0
  if (!goal.target_date || remaining === 0) return { remaining, progress, perMonth: null, monthsLeft: null }
  const [y, m] = goal.target_date.split('-').map(Number)
  const monthsLeft = Math.max(1, (y - today.getFullYear()) * 12 + (m - 1 - today.getMonth()) + 1)
  return { remaining, progress, perMonth: remaining / monthsLeft, monthsLeft }
}
