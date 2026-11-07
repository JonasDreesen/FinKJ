import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import TransactionSheet from '../components/TransactionSheet'

const SheetContext = createContext(undefined)

// Eén transactiepaneel voor de hele app: vanaf elk scherm (en via de
// "+"-knop) kan je een transactie toevoegen of bewerken.
export function SheetProvider({ children }) {
  const [state, setState] = useState({ open: false, transaction: null, preset: null })

  const openNew = useCallback((preset = null) => setState({ open: true, transaction: null, preset }), [])
  const openEdit = useCallback((transaction) => setState({ open: true, transaction, preset: null }), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])

  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit])

  return (
    <SheetContext.Provider value={value}>
      {children}
      <TransactionSheet open={state.open} transaction={state.transaction} preset={state.preset} onClose={close} />
    </SheetContext.Provider>
  )
}

export function useTransactionSheet() {
  const ctx = useContext(SheetContext)
  if (!ctx) throw new Error('useTransactionSheet moet binnen SheetProvider gebruikt worden')
  return ctx
}
