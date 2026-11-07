import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { formatMoney } from '../lib/format'
import { formatMonth, isSameMonth, shiftMonth } from '../lib/dates'
import { categoryColor } from '../lib/categories'

export function Money({ amount, currency, sign, compact, className = '', tone }) {
  const value = Number(amount) || 0
  const toneClass =
    tone === 'auto' ? (value > 0 ? 'text-income' : value < 0 ? 'text-expense' : '') : tone ? `text-${tone}` : ''
  return <span className={`money ${toneClass} ${className}`}>{formatMoney(value, { currency, sign, compact })}</span>
}

export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      {children}
    </header>
  )
}

export function Card({ className = '', children, ...props }) {
  return (
    <section className={`card ${className}`} {...props}>
      {children}
    </section>
  )
}

export function CardHeader({ title, icon: Icon, action, subtitle }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon size={17} className="shrink-0 text-muted" />}
        <div className="min-w-0">
          <h2 className="section-title truncate">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-expense">{error}</span>}
    </label>
  )
}

export function Segmented({ value, onChange, options, size = 'md', className = '' }) {
  return (
    <div
      role="radiogroup"
      className={`inline-flex rounded-pill bg-surface-2 p-1 ${size === 'sm' ? 'text-xs' : 'text-sm'} ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`flex-1 whitespace-nowrap rounded-pill font-medium transition ${
              size === 'sm' ? 'px-3 py-1' : 'px-4 py-1.5'
            } ${active ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function Switch({ checked, onChange, label, description }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-pill transition ${checked ? 'bg-brand-500' : 'bg-line'}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`}
        />
      </button>
    </div>
  )
}

export function ProgressBar({ ratio, tone = 'brand', className = '' }) {
  const color = { brand: 'bg-brand-500', ok: 'bg-emerald-500', warn: 'bg-amber-500', over: 'bg-rose-500' }[tone]
  return (
    <div className={`h-2 w-full overflow-hidden rounded-pill bg-surface-2 ${className}`}>
      <div
        className={`h-full rounded-pill transition-[width] duration-500 ${color}`}
        style={{ width: `${Math.max(2, Math.min(100, ratio * 100))}%` }}
      />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {Icon && (
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
          <Icon size={26} />
        </span>
      )}
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner({ className = '' }) {
  return <Loader2 className={`animate-spin text-muted ${className}`} size={20} />
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-2 ${className}`} />
}

export function CategoryIcon({ category, size = 40 }) {
  const color = categoryColor(category)
  const letter = (category?.name || '?').trim().charAt(0).toUpperCase()
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-2xl text-sm font-bold"
      style={{ width: size, height: size, backgroundColor: `${color}1f`, color }}
      aria-hidden="true"
    >
      {letter}
    </span>
  )
}

export function MonthSwitcher({ date, onChange, allowFuture = true }) {
  const atCurrent = isSameMonth(date, new Date())
  return (
    <div className="inline-flex items-center gap-1 rounded-pill border border-line bg-surface p-1 shadow-card">
      <button className="icon-btn h-8 w-8" onClick={() => onChange(shiftMonth(date, -1))} aria-label="Vorige maand">
        <ChevronLeft size={18} />
      </button>
      <button
        className="min-w-[8.5rem] px-1 text-center text-sm font-semibold capitalize"
        onClick={() => onChange(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
        title="Naar deze maand"
      >
        {formatMonth(date)}
      </button>
      <button
        className="icon-btn h-8 w-8"
        onClick={() => onChange(shiftMonth(date, 1))}
        disabled={!allowFuture && atCurrent}
        aria-label="Volgende maand"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

// Op gsm een paneel dat van onderen inschuift, op grotere schermen een dialoog.
export function Sheet({ open, onClose, title, children, footer, wide = false }) {
  const panelRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-4xl bg-surface shadow-sheet outline-none animate-sheet-in sm:max-h-[85vh] sm:animate-dialog-in sm:rounded-4xl ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-pill bg-line sm:hidden" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-3 sm:pt-5">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <button className="icon-btn -mr-2" onClick={onClose} aria-label="Sluiten">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line/70 bg-surface px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function AmountInput({ value, onChange, autoFocus, currency = '€', tone }) {
  return (
    <div className="flex items-baseline justify-center gap-1 py-2">
      <span className={`text-2xl font-semibold ${tone ? `text-${tone}` : 'text-muted'}`}>{currency}</span>
      <input
        inputMode="decimal"
        autoFocus={autoFocus}
        placeholder="0,00"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ''))}
        style={{ width: `${Math.min(10, Math.max(4, (value || '0,00').length + 0.5))}ch` }}
        className={`money bg-transparent text-left text-5xl font-semibold tracking-tight outline-none placeholder:text-line ${
          tone ? `text-${tone}` : ''
        }`}
        aria-label="Bedrag"
      />
    </div>
  )
}
