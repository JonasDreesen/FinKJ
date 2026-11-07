import { supabase, unwrap, fetchAll } from './supabase'
import { invalidate } from './store'
import { todayISO } from './dates'
import { resizeImage } from './image'

// ---------------------------------------------------------------- lezen

export const fetchMembers = () =>
  unwrap(supabase.from('app_members').select('user_id, display_name').order('created_at'))

export const fetchCategories = () =>
  unwrap(supabase.from('categories').select('*').order('name'))

export const fetchTags = () => unwrap(supabase.from('tags').select('*').order('name'))

export const fetchTemplates = () =>
  unwrap(supabase.from('transaction_templates').select('*').order('name'))

export const fetchTransactions = () =>
  fetchAll(() =>
    supabase
      .from('transactions')
      .select('*, transaction_tags(tag_id)')
      .eq('is_recurring', false)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id'),
  )

export const fetchRecurring = () =>
  unwrap(
    supabase
      .from('transactions')
      .select('*')
      .eq('is_recurring', true)
      .order('next_due_date', { ascending: true, nullsFirst: false }),
  )

export const fetchBudgets = () =>
  fetchAll(() => supabase.from('budgets').select('*').order('month').order('id'))

export const fetchGoals = () => unwrap(supabase.from('savings_goals').select('*').order('created_at'))

export const fetchInvestments = () =>
  unwrap(supabase.from('investments').select('*').order('created_at'))

export const fetchSettlements = () =>
  unwrap(supabase.from('settlements').select('*').order('settled_on', { ascending: false }).limit(50))

export const fetchSharedBalance = async () => Number(await unwrap(supabase.rpc('shared_balance'))) || 0

export async function fetchApiKey() {
  const row = await unwrap(supabase.from('user_settings').select('twelvedata_api_key').maybeSingle())
  return row?.twelvedata_api_key || ''
}

// ---------------------------------------------------------------- terugkerend

let lastRecurringRun = 0
export async function runDueRecurring({ force = false } = {}) {
  if (!force && Date.now() - lastRecurringRun < 15 * 60_000) return 0
  lastRecurringRun = Date.now()
  const created = await unwrap(supabase.rpc('generate_due_recurring', { p_today: todayISO() }))
  if (created > 0) invalidate('transactions', 'recurring')
  return created
}

// ---------------------------------------------------------------- transacties

function cleanTransaction(t) {
  return {
    type: t.type,
    amount: t.amount,
    description: t.description?.trim() || null,
    category_id: t.category_id || null,
    occurred_on: t.occurred_on,
    is_shared: Boolean(t.is_shared),
    paid_by: t.is_shared ? t.paid_by || undefined : undefined,
    receipt_path: t.receipt_path || null,
    receipt_text: t.receipt_text?.slice(0, 20000) || null,
  }
}

async function syncTags(transactionId, tagIds) {
  await unwrap(supabase.from('transaction_tags').delete().eq('transaction_id', transactionId))
  if (tagIds?.length) {
    await unwrap(
      supabase
        .from('transaction_tags')
        .insert(tagIds.map((tag_id) => ({ transaction_id: transactionId, tag_id }))),
    )
  }
}

export async function saveTransaction(t) {
  const fields = cleanTransaction(t)
  if (t.id) {
    await unwrap(
      supabase
        .from('transactions')
        .update({ ...fields, pending_review: false })
        .eq('id', t.id),
    )
    await syncTags(t.id, t.tag_ids)
  } else if (t.is_recurring) {
    await unwrap(
      supabase.from('transactions').insert({
        ...fields,
        receipt_path: null,
        receipt_text: null,
        is_recurring: true,
        recurrence_interval: t.recurrence_interval,
        recurrence_end_date: t.recurrence_end_date || null,
        next_due_date: t.occurred_on,
      }),
    )
    await runDueRecurring({ force: true })
  } else {
    const row = await unwrap(supabase.from('transactions').insert(fields).select('id').single())
    if (t.tag_ids?.length) await syncTags(row.id, t.tag_ids)
  }
  invalidate('transactions', 'recurring', 'balance')
}

export async function updateRecurring(id, fields) {
  await unwrap(
    supabase
      .from('transactions')
      .update({
        amount: fields.amount,
        description: fields.description?.trim() || null,
        category_id: fields.category_id || null,
        is_shared: Boolean(fields.is_shared),
        paid_by: fields.is_shared ? fields.paid_by || undefined : undefined,
        recurrence_interval: fields.recurrence_interval,
        recurrence_end_date: fields.recurrence_end_date || null,
      })
      .eq('id', id),
  )
  invalidate('recurring')
}

export async function deleteTransaction(t, currentUserId) {
  await unwrap(supabase.from('transactions').delete().eq('id', t.id))
  if (t.receipt_path?.startsWith(`${currentUserId}/`)) {
    await supabase.storage.from('receipts').remove([t.receipt_path])
  }
  invalidate('transactions', 'recurring', 'balance')
}

export async function confirmTransactions(ids) {
  await unwrap(supabase.from('transactions').update({ pending_review: false }).in('id', ids))
  invalidate('transactions')
}

export async function importTransactions(rows) {
  let imported = 0
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200).map(cleanTransaction)
    await unwrap(supabase.from('transactions').insert(batch))
    imported += batch.length
  }
  invalidate('transactions', 'balance')
  return imported
}

// ---------------------------------------------------------------- bonnetjes

export async function uploadReceipt(file, userId) {
  const blob = await resizeImage(file)
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  await unwrap(
    supabase.storage.from('receipts').upload(path, blob, { contentType: 'image/jpeg', upsert: false }),
  )
  return path
}

export async function getReceiptUrl(path) {
  const data = await unwrap(supabase.storage.from('receipts').createSignedUrl(path, 120))
  return data.signedUrl
}

export async function removeReceipt(path) {
  await supabase.storage.from('receipts').remove([path])
}

// ---------------------------------------------------------------- budgetten & sparen

export async function saveBudget(b) {
  const fields = {
    category_id: b.category_id,
    is_shared: Boolean(b.is_shared),
    month: b.month,
    amount: b.amount,
    rollover: Boolean(b.rollover),
    actual_amount: b.actual_amount === '' || b.actual_amount == null ? null : b.actual_amount,
  }
  if (b.id) await unwrap(supabase.from('budgets').update(fields).eq('id', b.id))
  else await unwrap(supabase.from('budgets').insert(fields))
  invalidate('budgets')
}

export async function deleteBudget(id) {
  await unwrap(supabase.from('budgets').delete().eq('id', id))
  invalidate('budgets')
}

export async function copyBudgets(fromRows, toMonth, existingRows) {
  const exists = (r) =>
    existingRows.some((e) => e.category_id === r.category_id && e.is_shared === r.is_shared)
  const rows = fromRows
    .filter((r) => !exists(r))
    .map((r) => ({
      category_id: r.category_id,
      is_shared: r.is_shared,
      month: toMonth,
      amount: r.amount,
      rollover: r.rollover,
    }))
  if (rows.length) await unwrap(supabase.from('budgets').insert(rows))
  invalidate('budgets')
  return rows.length
}

export async function saveGoal(g) {
  const fields = {
    name: g.name.trim(),
    target_amount: g.target_amount,
    is_shared: Boolean(g.is_shared),
    target_date: g.target_date || null,
  }
  if (g.id) await unwrap(supabase.from('savings_goals').update(fields).eq('id', g.id))
  else await unwrap(supabase.from('savings_goals').insert({ ...fields, current_amount: g.current_amount || 0 }))
  invalidate('goals')
}

export async function depositToGoal(goal, amount) {
  const next = Math.max(0, Math.round((Number(goal.current_amount) + amount) * 100) / 100)
  await unwrap(supabase.from('savings_goals').update({ current_amount: next }).eq('id', goal.id))
  invalidate('goals')
}

export async function deleteGoal(id) {
  await unwrap(supabase.from('savings_goals').delete().eq('id', id))
  invalidate('goals')
}

// ---------------------------------------------------------------- categorieën, tags, sjablonen

export async function saveCategory(c) {
  const fields = { name: c.name.trim(), color: c.color || null, tax_deductible: Boolean(c.tax_deductible) }
  if (c.id) await unwrap(supabase.from('categories').update(fields).eq('id', c.id))
  else await unwrap(supabase.from('categories').insert(fields))
  invalidate('categories')
}

export async function deleteCategory(id) {
  await unwrap(supabase.from('categories').delete().eq('id', id))
  invalidate('categories', 'transactions', 'budgets')
}

export async function saveTag(t) {
  if (t.id) await unwrap(supabase.from('tags').update({ name: t.name.trim() }).eq('id', t.id))
  else await unwrap(supabase.from('tags').insert({ name: t.name.trim() }))
  invalidate('tags')
}

export async function deleteTag(id) {
  await unwrap(supabase.from('tags').delete().eq('id', id))
  invalidate('tags', 'transactions')
}

export async function saveTemplate(t) {
  const fields = {
    name: t.name.trim(),
    type: t.type,
    amount: t.amount,
    category_id: t.category_id || null,
    is_shared: Boolean(t.is_shared),
  }
  if (t.id) await unwrap(supabase.from('transaction_templates').update(fields).eq('id', t.id))
  else await unwrap(supabase.from('transaction_templates').insert(fields))
  invalidate('templates')
}

export async function deleteTemplate(id) {
  await unwrap(supabase.from('transaction_templates').delete().eq('id', id))
  invalidate('templates')
}

// ---------------------------------------------------------------- beleggingen

export async function saveInvestment(i) {
  const fields = {
    symbol: i.symbol.trim().toUpperCase(),
    name: i.name?.trim() || null,
    currency: (i.currency || 'EUR').toUpperCase(),
    quantity: i.quantity,
    purchase_price: i.purchase_price,
    purchase_date: i.purchase_date,
  }
  if (i.id) await unwrap(supabase.from('investments').update(fields).eq('id', i.id))
  else await unwrap(supabase.from('investments').insert(fields))
  invalidate('investments')
}

export async function setInvestmentPrices(prices) {
  const now = new Date().toISOString()
  for (const { id, price } of prices) {
    await unwrap(
      supabase
        .from('investments')
        .update({ current_price: price, current_price_updated_at: now })
        .eq('id', id),
    )
  }
  invalidate('investments')
}

export async function deleteInvestment(id) {
  await unwrap(supabase.from('investments').delete().eq('id', id))
  invalidate('investments')
}

// ---------------------------------------------------------------- afrekenen, profiel, instellingen

export async function createSettlement({ amount, note, paid_by }) {
  await unwrap(
    supabase.from('settlements').insert({ amount, paid_by, note: note?.trim() || null, settled_on: todayISO() }),
  )
  invalidate('balance', 'settlements')
}

export async function deleteSettlement(id) {
  await unwrap(supabase.from('settlements').delete().eq('id', id))
  invalidate('balance', 'settlements')
}

export async function updateDisplayName(userId, name) {
  await unwrap(supabase.from('app_members').update({ display_name: name.trim() }).eq('user_id', userId))
  invalidate('members')
}

export async function saveApiKey(userId, key) {
  await unwrap(
    supabase
      .from('user_settings')
      .upsert({ user_id: userId, twelvedata_api_key: key.trim() || null, updated_at: new Date().toISOString() }),
  )
  invalidate('apikey')
}
