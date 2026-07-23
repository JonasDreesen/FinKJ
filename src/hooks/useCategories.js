import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    if (!error) setCategories(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addCategory(name, color) {
    const { error } = await supabase.from('categories').insert({ name, color })
    if (!error) await refresh()
    return { error }
  }

  async function deleteCategory(id) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) await refresh()
    return { error }
  }

  return { categories, loading, addCategory, deleteCategory, refresh }
}
