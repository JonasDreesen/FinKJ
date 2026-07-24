import { supabase } from './supabaseClient'

const TABLES = ['categories', 'tags', 'transactions', 'transaction_tags', 'budgets', 'savings_goals', 'transaction_templates']

export async function fetchFullBackup() {
  const backup = { exportedAt: new Date().toISOString() }
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*')
    backup[table] = error ? [] : data
  }
  return backup
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
