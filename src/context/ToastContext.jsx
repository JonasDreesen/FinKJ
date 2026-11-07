import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { friendlyError } from '../lib/errors'

const ToastContext = createContext(undefined)
let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const pending = useRef(new Map()) // id -> { commit, timer }
  const [hidden, setHidden] = useState(() => new Set())

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const toast = useCallback(
    (message, { tone = 'success', action, duration = 3500 } = {}) => {
      const id = nextId++
      setToasts((list) => [...list.slice(-2), { id, message, tone, action }])
      if (duration) setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  const showError = useCallback(
    (error, fallback) => toast(friendlyError(error, fallback), { tone: 'error', duration: 6000 }),
    [toast],
  )

  const unhide = useCallback((key) => {
    setHidden((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [])

  const runCommit = useCallback(
    async (toastId) => {
      const item = pending.current.get(toastId)
      if (!item) return
      pending.current.delete(toastId)
      clearTimeout(item.timer)
      try {
        await item.commit()
      } catch (error) {
        unhide(item.key)
        showError(error, 'Verwijderen mislukt.')
      }
    },
    [showError, unhide],
  )

  // Verwijderen met "ongedaan maken": het item verdwijnt meteen uit beeld en
  // wordt pas na 5 seconden echt verwijderd.
  const removeWithUndo = useCallback(
    ({ key, message, commit }) => {
      setHidden((prev) => new Set(prev).add(key))
      const id = nextId++
      const timer = setTimeout(() => {
        dismiss(id)
        runCommit(id)
      }, 5000)
      pending.current.set(id, { key, commit, timer })
      setToasts((list) => [
        ...list.slice(-2),
        {
          id,
          message,
          tone: 'info',
          action: {
            label: 'Ongedaan maken',
            onClick: () => {
              const item = pending.current.get(id)
              if (item) clearTimeout(item.timer)
              pending.current.delete(id)
              unhide(key)
              dismiss(id)
            },
          },
        },
      ])
    },
    [dismiss, runCommit, unhide],
  )

  // App gesloten of naar achtergrond: openstaande verwijderingen meteen uitvoeren.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') [...pending.current.keys()].forEach(runCommit)
    }
    document.addEventListener('visibilitychange', flush)
    return () => document.removeEventListener('visibilitychange', flush)
  }, [runCommit])

  const value = useMemo(
    () => ({ toast, showError, removeWithUndo, isHidden: (key) => hidden.has(key) }),
    [toast, showError, removeWithUndo, hidden],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] lg:bottom-6"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-md animate-toast-in items-center gap-3 rounded-2xl bg-[#14172a] px-4 py-3 text-sm text-white shadow-xl"
          >
            {t.tone === 'error' ? (
              <AlertCircle size={18} className="shrink-0 text-rose-300" />
            ) : t.tone === 'info' ? (
              <Info size={18} className="shrink-0 text-brand-300" />
            ) : (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-300" />
            )}
            <span className="flex-1">{t.message}</span>
            {t.action ? (
              <button
                onClick={t.action.onClick}
                className="shrink-0 rounded-pill px-2 py-1 font-semibold text-brand-200 hover:bg-white/10"
              >
                {t.action.label}
              </button>
            ) : (
              <button onClick={() => dismiss(t.id)} className="shrink-0 text-white/60 hover:text-white" aria-label="Sluiten">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast moet binnen ToastProvider gebruikt worden')
  return ctx
}
