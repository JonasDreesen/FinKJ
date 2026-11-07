import { useEffect, useMemo, useState } from 'react'
import { KeyRound, LineChart, Lock, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { Card, CardHeader, EmptyState, Field, Money, PageHeader, Sheet } from '../components/ui'
import { useApiKey, useInvestments } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fetchPrices, isValidApiKey, searchSymbols } from '../lib/twelveData'
import { formatMoney, formatPercent, parseAmount } from '../lib/format'
import { formatDate, todayISO } from '../lib/dates'
import * as api from '../lib/api'

function SymbolSearch({ apiKey, value, onChange, onPick }) {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || !apiKey) return
    const handle = setTimeout(async () => setResults(await searchSymbols(value, apiKey)), 350)
    return () => clearTimeout(handle)
  }, [value, open, apiKey])

  return (
    <div className="relative">
      <Search size={17} className="pointer-events-none absolute left-3.5 top-[23px] -translate-y-1/2 text-muted" />
      <input
        className="input pl-10 uppercase"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={apiKey ? 'Zoek, bv. Apple of VWCE' : 'Ticker, bv. VWCE'}
        maxLength={24}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-line bg-surface p-1 shadow-card">
          {results.map((r) => (
            <li key={`${r.symbol}-${r.exchange}`}>
              <button
                type="button"
                onMouseDown={() => {
                  onPick(r)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{r.symbol}</span>
                  <span className="block truncate text-xs text-muted">{r.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {r.exchange} · {r.currency}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function InvestmentSheet({ item, apiKey, onClose }) {
  const { toast, showError, removeWithUndo } = useToast()
  const editing = Boolean(item?.id)
  const [form, setForm] = useState({
    symbol: item?.symbol || '',
    name: item?.name || '',
    currency: item?.currency || 'EUR',
    quantity: item ? String(item.quantity).replace('.', ',') : '',
    purchase_price: item ? String(item.purchase_price).replace('.', ',') : '',
    purchase_date: item?.purchase_date || todayISO(),
    current_price: item?.current_price != null ? String(item.current_price).replace('.', ',') : '',
  })
  const [saving, setSaving] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  async function submit(e) {
    e.preventDefault()
    const quantity = parseAmount(form.quantity)
    const price = parseAmount(form.purchase_price)
    const current = form.current_price.trim() ? parseAmount(form.current_price) : null
    if (!form.symbol.trim()) return showError(null, 'Vul een ticker in.')
    if (!(quantity > 0) || !(price >= 0)) return showError(null, 'Vul een geldig aantal en aankoopprijs in.')
    if (!/^[A-Za-z]{3}$/.test(form.currency)) return showError(null, 'Munt moet een code van 3 letters zijn (bv. EUR).')
    setSaving(true)
    try {
      await api.saveInvestment({ ...form, id: item?.id, quantity, purchase_price: price })
      if (editing && current !== null && current !== Number(item.current_price)) {
        await api.setInvestmentPrices([{ id: item.id, price: current }])
      }
      toast(editing ? 'Positie bijgewerkt' : 'Positie toegevoegd')
      onClose()
    } catch (error) {
      showError(error, 'Opslaan mislukt.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? form.name || form.symbol : 'Positie toevoegen'}
      footer={
        <div className="flex gap-2">
          {editing && (
            <button
              type="button"
              className="btn btn-danger px-4"
              aria-label="Verwijderen"
              onClick={() => {
                onClose()
                removeWithUndo({ key: item.id, message: 'Positie verwijderd', commit: () => api.deleteInvestment(item.id) })
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button form="inv-form" className="btn btn-primary flex-1" disabled={saving}>
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      }
    >
      <form id="inv-form" onSubmit={submit} className="space-y-4">
        <Field label="Ticker / symbool">
          <SymbolSearch
            apiKey={apiKey}
            value={form.symbol}
            onChange={(symbol) => set({ symbol })}
            onPick={(r) => set({ symbol: r.symbol, name: form.name || r.name, currency: r.currency || form.currency })}
          />
        </Field>
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Field label="Naam (optioneel)">
            <input className="input" maxLength={120} value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Munt">
            <input className="input uppercase" maxLength={3} value={form.currency} onChange={(e) => set({ currency: e.target.value.toUpperCase() })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Aantal">
            <input className="input money" inputMode="decimal" value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} />
          </Field>
          <Field label="Aankoopprijs / stuk">
            <input className="input money" inputMode="decimal" value={form.purchase_price} onChange={(e) => set({ purchase_price: e.target.value })} />
          </Field>
        </div>
        <Field label="Aankoopdatum">
          <input type="date" className="input" value={form.purchase_date} max={todayISO()} onChange={(e) => set({ purchase_date: e.target.value })} />
        </Field>
        {editing && (
          <Field label="Huidige koers (handmatig)" hint="Of laat de app de koers ophalen met een Twelve Data-sleutel.">
            <input className="input money" inputMode="decimal" value={form.current_price} onChange={(e) => set({ current_price: e.target.value })} />
          </Field>
        )}
      </form>
    </Sheet>
  )
}

function ApiKeyCard({ apiKey }) {
  const { user } = useAuth()
  const { toast, showError } = useToast()
  const [open, setOpen] = useState(!apiKey)
  const [value, setValue] = useState('')

  async function save(e) {
    e.preventDefault()
    if (value && !isValidApiKey(value.trim())) return showError(null, 'Dit lijkt geen geldige Twelve Data-sleutel.')
    try {
      await api.saveApiKey(user.id, value)
      setValue('')
      setOpen(false)
      toast(value ? 'Sleutel opgeslagen' : 'Sleutel verwijderd')
    } catch (error) {
      showError(error)
    }
  }

  return (
    <Card className="p-5">
      <CardHeader
        title="Automatische koersen"
        subtitle={apiKey ? `Sleutel ingesteld (…${apiKey.slice(-4)})` : 'Nog geen sleutel ingesteld'}
        icon={KeyRound}
        action={
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)}>
            {open ? 'Sluiten' : apiKey ? 'Wijzigen' : 'Instellen'}
          </button>
        }
      />
      {open && (
        <form onSubmit={save} className="space-y-3">
          <p className="text-sm text-muted">
            Maak een gratis account op twelvedata.com en plak je API-sleutel hieronder. Hij wordt privé bewaard op je
            account — enkel jij kan hem lezen — en nooit getoond of meegenomen in back-ups.
          </p>
          <div className="flex gap-2">
            <input
              className="input"
              type="password"
              autoComplete="off"
              placeholder={apiKey ? 'Nieuwe sleutel (leeg = verwijderen)' : 'API-sleutel'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <button className="btn btn-primary">Opslaan</button>
          </div>
        </form>
      )}
    </Card>
  )
}

export default function Investments() {
  const { investments } = useInvestments()
  const { apiKey } = useApiKey()
  const { toast, showError } = useToast()
  const [sheet, setSheet] = useState(null)
  const [progress, setProgress] = useState(null)

  const rows = useMemo(
    () =>
      investments.map((inv) => {
        const cost = Number(inv.quantity) * Number(inv.purchase_price)
        const value = inv.current_price != null ? Number(inv.quantity) * Number(inv.current_price) : null
        return { ...inv, cost, value, gain: value != null ? value - cost : null }
      }),
    [investments],
  )

  const byCurrency = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const c = map.get(r.currency) || { currency: r.currency, cost: 0, value: 0 }
      c.cost += r.cost
      c.value += r.value ?? r.cost
      map.set(r.currency, c)
    }
    return [...map.values()]
  }, [rows])

  async function refreshPrices() {
    try {
      setProgress({ done: 0, total: rows.length })
      const prices = await fetchPrices(rows.map((r) => r.symbol), apiKey, setProgress)
      const updates = rows.filter((r) => prices[r.symbol]).map((r) => ({ id: r.id, price: prices[r.symbol] }))
      await api.setInvestmentPrices(updates)
      const missing = rows.length - updates.length
      toast(`${updates.length} koers(en) bijgewerkt${missing ? `, ${missing} niet gevonden` : ''}`)
    } catch (error) {
      showError(error, 'Koersen ophalen mislukt. Controleer je sleutel en ticker.')
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Beleggingen"
        subtitle={
          <span className="inline-flex items-center gap-1">
            <Lock size={12} /> Enkel jij ziet je portefeuille
          </span>
        }
        actions={
          <>
            {apiKey && rows.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={refreshPrices} disabled={Boolean(progress)}>
                <RefreshCw size={15} className={progress ? 'animate-spin' : ''} />
                {progress ? (progress.waiting ? 'Even wachten…' : `${progress.done}/${progress.total}`) : 'Koersen'}
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setSheet('new')}>
              <Plus size={16} /> Positie
            </button>
          </>
        }
      />

      {byCurrency.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {byCurrency.map((c) => {
            const gain = c.value - c.cost
            return (
              <section key={c.currency} className="rounded-4xl bg-gradient-to-br from-[#1c1e54] to-brand-700 p-5 text-white shadow-lift">
                <p className="text-sm text-white/70">Waarde in {c.currency}</p>
                <Money amount={c.value} currency={c.currency} className="block text-3xl font-semibold tracking-tight" />
                <p className="mt-2 text-sm">
                  <span className={gain >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                    <Money amount={gain} currency={c.currency} sign /> ({formatPercent(c.cost ? (gain / c.cost) * 100 : 0, 1)})
                  </span>
                  <span className="text-white/60"> · ingelegd {formatMoney(c.cost, { currency: c.currency })}</span>
                </p>
              </section>
            )
          })}
        </div>
      )}

      <Card className="p-2 sm:p-3">
        {rows.length === 0 ? (
          <EmptyState
            icon={LineChart}
            title="Nog geen posities"
            text="Voeg je aandelen, ETF's of fondsen toe om je rendement op te volgen."
            action={
              <button className="btn btn-primary btn-sm" onClick={() => setSheet('new')}>
                <Plus size={16} /> Positie toevoegen
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-line/60">
            {rows.map((r) => {
              const pct = r.gain != null && r.cost ? (r.gain / r.cost) * 100 : null
              return (
                <li key={r.id}>
                  <button className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left hover:bg-surface-2" onClick={() => setSheet(r)}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-[11px] font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-200">
                      {r.symbol.slice(0, 4)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.name || r.symbol}</span>
                      <span className="block truncate text-xs text-muted">
                        {String(r.quantity).replace('.', ',')} × {formatMoney(r.purchase_price, { currency: r.currency })}
                        {r.current_price_updated_at && ` · koers ${formatDate(r.current_price_updated_at.slice(0, 10), { day: 'numeric', month: 'short' })}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <Money amount={r.value ?? r.cost} currency={r.currency} className="block font-semibold" />
                      {pct != null ? (
                        <span className={`text-xs font-medium ${pct >= 0 ? 'text-income' : 'text-expense'}`}>
                          {pct >= 0 ? '+' : ''}
                          {formatPercent(pct, 1)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">geen koers</span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <ApiKeyCard apiKey={apiKey} />

      {sheet && <InvestmentSheet item={sheet === 'new' ? null : sheet} apiKey={apiKey} onClose={() => setSheet(null)} />}
    </div>
  )
}
