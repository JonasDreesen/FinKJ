import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase configuratie ontbreekt. Zet VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in je .env bestand (lokaal) of GitHub Secrets (deploy).',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
