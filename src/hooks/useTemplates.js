import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { loadCache, saveCache } from '../lib/offlineCache'

export function useTemplates() {
  const [templates, setTemplates] = useState(() => loadCache('templates') || [])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('transaction_templates')
      .select('*, category:categories(id, name)')
      .order('name')
    if (!error) {
      setTemplates(data)
      saveCache('templates', data)
    } else {
      const cached = loadCache('templates')
      if (cached) setTemplates(cached)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addTemplate({ name, type, amount, categoryId, isShared }) {
    const { error } = await supabase.from('transaction_templates').insert({
      name,
      type,
      amount,
      category_id: categoryId || null,
      is_shared: isShared,
    })
    if (!error) await refresh()
    return { error }
  }

  async function deleteTemplate(id) {
    const { error } = await supabase.from('transaction_templates').delete().eq('id', id)
    if (!error) await refresh()
    return { error }
  }

  return { templates, loading, addTemplate, deleteTemplate }
}
