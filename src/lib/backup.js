import { supabase, fetchAll } from './supabase'
import { downloadFile } from './csv'
import { todayISO } from './dates'

// Persoonlijke instellingen (zoals je API-sleutel) worden bewust NIET mee
// geëxporteerd: een back-upbestand mag geen geheimen bevatten.
const TABLES = [
  'app_members',
  'categories',
  'tags',
  'transactions',
  'transaction_tags',
  'transaction_templates',
  'budgets',
  'savings_goals',
  'settlements',
  'investments',
]

export async function downloadFullBackup() {
  const backup = { app: 'FinKJ', version: 2, exportedAt: new Date().toISOString() }
  for (const table of TABLES) {
    backup[table] = await fetchAll(() => supabase.from(table).select('*'))
  }
  downloadFile(`finkj-backup-${todayISO()}.json`, JSON.stringify(backup, null, 2), 'application/json')
}
