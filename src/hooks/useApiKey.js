import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const LOCAL_STORAGE_KEY = 'twelvedata_api_key'

function loadLocalKey() {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function saveLocalKey(key) {
  try {
    if (key) localStorage.setItem(LOCAL_STORAGE_KEY, key)
    else localStorage.removeItem(LOCAL_STORAGE_KEY)
  } catch {
    // localStorage niet beschikbaar — negeren, Supabase blijft de bron van waarheid.
  }
}

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState(loadLocalKey)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('twelvedata_api_key')
      .maybeSingle()

    if (!error && data?.twelvedata_api_key) {
      setApiKeyState(data.twelvedata_api_key)
      saveLocalKey(data.twelvedata_api_key)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function saveApiKey(key) {
    const trimmed = key.trim()
    setApiKeyState(trimmed)
    saveLocalKey(trimmed)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, twelvedata_api_key: trimmed, updated_at: new Date().toISOString() })

    return { error }
  }

  return { apiKey, loading, saveApiKey }
}
