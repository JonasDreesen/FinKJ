import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient(
  supabaseUrl || 'https://not-configured.invalid',
  supabaseAnonKey || 'not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // We gebruiken geen magic links of OAuth: nooit tokens uit de URL lezen.
      detectSessionInUrl: false,
      flowType: 'pkce',
      storageKey: 'finkj-auth',
    },
  },
)

export async function unwrap(promise) {
  const { data, error } = await promise
  if (error) throw error
  return data
}

// Supabase geeft standaard maximaal 1000 rijen terug: haal alles op in pagina's.
export async function fetchAll(buildQuery, pageSize = 1000) {
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < pageSize) return rows
  }
}
