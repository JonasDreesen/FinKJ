import { useCallback, useRef, useState } from 'react'

export function useUndoableDelete(performDelete, delayMs = 5000) {
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const timeouts = useRef({})

  const scheduleDelete = useCallback(
    (id) => {
      setPendingIds((prev) => new Set(prev).add(id))
      timeouts.current[id] = setTimeout(async () => {
        delete timeouts.current[id]
        setPendingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        await performDelete(id)
      }, delayMs)
    },
    [performDelete, delayMs],
  )

  const undo = useCallback((id) => {
    clearTimeout(timeouts.current[id])
    delete timeouts.current[id]
    setPendingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const isPending = useCallback((id) => pendingIds.has(id), [pendingIds])

  return { isPending, scheduleDelete, undo }
}
