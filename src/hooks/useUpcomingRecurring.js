import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { today } from '../lib/recurrence'

function addDays(dateString, days) {
  const date = new Date(dateString + 'T00:00:00')
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function useUpcomingRecurring() {
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const todayStr = today()
      const inSevenDays = addDays(todayStr, 7)
      const { data, error } = await supabase
        .from('transactions')
        .select('id, description, amount, type, is_shared, recurrence_interval, next_due_date, category:categories(name)')
        .eq('is_recurring', true)
        .gte('next_due_date', todayStr)
        .lte('next_due_date', inSevenDays)
        .order('next_due_date')

      if (!error) setUpcoming(data)
      setLoading(false)
    }
    load()
  }, [])

  return { upcoming, loading }
}
