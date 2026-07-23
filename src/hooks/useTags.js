import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useTags() {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from('tags').select('*').order('name')
    if (!error) setTags(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addTag(name) {
    const { error } = await supabase.from('tags').insert({ name })
    if (!error) await refresh()
    return { error }
  }

  async function deleteTag(id) {
    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (!error) await refresh()
    return { error }
  }

  return { tags, loading, addTag, deleteTag, refresh }
}
