import { useMemo } from 'react'
import { useQuery } from '../lib/store'
import * as api from '../lib/api'
import { UNCATEGORIZED } from '../lib/categories'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const EMPTY = []

export function useCategories() {
  const q = useQuery('categories', api.fetchCategories, { tags: ['categories'] })
  const categories = q.data || EMPTY
  const byId = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c]))
    map.set('none', UNCATEGORIZED)
    return map
  }, [categories])
  return { ...q, categories, byId }
}

export function useTags() {
  const q = useQuery('tags', api.fetchTags, { tags: ['tags'] })
  const tags = q.data || EMPTY
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  return { ...q, tags, byId }
}

export function useTemplates() {
  const q = useQuery('templates', api.fetchTemplates, { tags: ['templates'] })
  return { ...q, templates: useVisible(q.data || EMPTY) }
}

function useVisible(rows) {
  const { isHidden } = useToast()
  return useMemo(() => rows.filter((r) => !isHidden(r.id)), [rows, isHidden])
}

export function useTransactions() {
  const q = useQuery('transactions', api.fetchTransactions, { tags: ['transactions'] })
  return { ...q, transactions: useVisible(q.data || EMPTY) }
}

export function useRecurring() {
  const q = useQuery('recurring', api.fetchRecurring, { tags: ['recurring'] })
  return { ...q, recurring: useVisible(q.data || EMPTY) }
}

export function useBudgets() {
  const q = useQuery('budgets', api.fetchBudgets, { tags: ['budgets'] })
  return { ...q, budgets: useVisible(q.data || EMPTY) }
}

export function useGoals() {
  const q = useQuery('goals', api.fetchGoals, { tags: ['goals'] })
  return { ...q, goals: useVisible(q.data || EMPTY) }
}

export function useInvestments() {
  const q = useQuery('investments', api.fetchInvestments, { tags: ['investments'] })
  return { ...q, investments: useVisible(q.data || EMPTY) }
}

export function useSharedBalance() {
  const q = useQuery('balance', api.fetchSharedBalance, { tags: ['balance', 'transactions'] })
  return { ...q, balance: q.data ?? 0 }
}

export function useSettlements() {
  const q = useQuery('settlements', api.fetchSettlements, { tags: ['settlements'] })
  return { ...q, settlements: useVisible(q.data || EMPTY) }
}

export function useApiKey() {
  const q = useQuery('apikey', api.fetchApiKey, { tags: ['apikey'] })
  return { ...q, apiKey: q.data || '' }
}

export function useMembers() {
  const { user } = useAuth()
  const q = useQuery('members', api.fetchMembers, { tags: ['members'] })
  const members = q.data || EMPTY
  return useMemo(() => {
    const me = members.find((m) => m.user_id === user?.id) || null
    const partner = members.find((m) => m.user_id !== user?.id) || null
    const nameOf = (id) => members.find((m) => m.user_id === id)?.display_name || 'Onbekend'
    return { ...q, members, me, partner, nameOf }
  }, [q, members, user?.id])
}
