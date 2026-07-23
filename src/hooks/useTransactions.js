import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { addInterval, today } from '../lib/recurrence'

const SELECT_FIELDS = `
  *,
  category:categories(id, name, color),
  transaction_tags(tag_id, tags(id, name))
`

async function generateDueRecurring() {
  const todayStr = today()
  const { data: templates, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('is_recurring', true)
    .lte('next_due_date', todayStr)

  if (error || !templates || templates.length === 0) return

  for (const tmpl of templates) {
    let due = tmpl.next_due_date
    let iterations = 0
    while (
      due &&
      due <= todayStr &&
      (!tmpl.recurrence_end_date || due <= tmpl.recurrence_end_date) &&
      iterations < 500
    ) {
      await supabase.from('transactions').insert({
        is_shared: tmpl.is_shared,
        type: tmpl.type,
        amount: tmpl.amount,
        description: tmpl.description,
        category_id: tmpl.category_id,
        occurred_on: due,
        is_recurring: false,
        parent_transaction_id: tmpl.id,
      })
      due = addInterval(due, tmpl.recurrence_interval)
      iterations += 1
    }

    const stillActive = !tmpl.recurrence_end_date || due <= tmpl.recurrence_end_date
    await supabase
      .from('transactions')
      .update({ next_due_date: stillActive ? due : null })
      .eq('id', tmpl.id)
  }
}

export function useTransactions() {
  const [transactions, setTransactions] = useState([])
  const [recurringTemplates, setRecurringTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    await generateDueRecurring()

    const [instancesRes, templatesRes] = await Promise.all([
      supabase
        .from('transactions')
        .select(SELECT_FIELDS)
        .eq('is_recurring', false)
        .order('occurred_on', { ascending: false }),
      supabase
        .from('transactions')
        .select(SELECT_FIELDS)
        .eq('is_recurring', true)
        .order('occurred_on', { ascending: false }),
    ])

    if (!instancesRes.error) setTransactions(instancesRes.data)
    if (!templatesRes.error) setRecurringTemplates(templatesRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addTransaction({
    type,
    amount,
    description,
    categoryId,
    occurredOn,
    isShared,
    tagIds,
    isRecurring,
    recurrenceInterval,
    recurrenceEndDate,
  }) {
    const payload = {
      type,
      amount,
      description,
      category_id: categoryId || null,
      occurred_on: occurredOn,
      is_shared: isShared,
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? recurrenceInterval : null,
      recurrence_end_date: isRecurring ? recurrenceEndDate || null : null,
      next_due_date: isRecurring ? occurredOn : null,
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single()

    if (error) return { error }

    if (!isRecurring && tagIds && tagIds.length > 0) {
      await supabase
        .from('transaction_tags')
        .insert(tagIds.map((tagId) => ({ transaction_id: data.id, tag_id: tagId })))
    }

    await refresh()
    return { error: null }
  }

  async function updateTransaction(id, fields, tagIds) {
    const { error } = await supabase.from('transactions').update(fields).eq('id', id)
    if (error) return { error }

    if (tagIds !== undefined) {
      await supabase.from('transaction_tags').delete().eq('transaction_id', id)
      if (tagIds.length > 0) {
        await supabase
          .from('transaction_tags')
          .insert(tagIds.map((tagId) => ({ transaction_id: id, tag_id: tagId })))
      }
    }

    await refresh()
    return { error: null }
  }

  async function deleteTransaction(id) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) await refresh()
    return { error }
  }

  async function stopRecurring(id) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) await refresh()
    return { error }
  }

  return {
    transactions,
    recurringTemplates,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    stopRecurring,
  }
}
