import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useSharedBalance(currentUserId) {
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('transactions')
        .select('user_id, amount')
        .eq('is_shared', true)
        .eq('type', 'expense')
        .eq('is_recurring', false)

      if (error || !data) {
        setLoading(false)
        return
      }

      let paidByMe = 0
      let paidByOther = 0
      for (const t of data) {
        if (t.user_id === currentUserId) paidByMe += Number(t.amount)
        else paidByOther += Number(t.amount)
      }

      // Positief = je partner is jou dit bedrag verschuldigd; negatief = omgekeerd.
      setBalance((paidByMe - paidByOther) / 2)
      setLoading(false)
    }
    if (currentUserId) load()
  }, [currentUserId])

  return { balance, loading }
}
