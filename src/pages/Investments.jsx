import { useEffect, useMemo, useState } from 'react'
import { useInvestments } from '../hooks/useInvestments'
import { useUndoableDelete } from '../hooks/useUndoableDelete'
import { friendlyError } from '../lib/errors'
import { today } from '../lib/recurrence'
import { getApiKey, searchSymbols, setApiKey } from '../lib/twelveData'

function formatAmount(amount) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function SymbolPicker({ symbol, setSymbol, onPick }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handle = setTimeout(async () => {
      const results = await searchSymbols(symbol)
      setSuggestions(results)
    }, 400)
    return () => clearTimeout(handle)
  }, [symbol, open])

  return (
    <div className="relative">
      <input
        value={symbol}
        onChange={(e) => {
          setSymbol(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={getApiKey() ? 'Typ om te zoeken, bv. Apple' : 'AAPL.US'}
        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white text-sm shadow-lg dark:border-gray-600 dark:bg-gray-800">
          {suggestions.map((s) => (
            <li key={`${s.symbol}-${s.exchange}`}>
              <button
                type="button"
                onMouseDown={() => {
                  onPick(s)
                  setOpen(false)
                }}
                className="block w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="font-medium">{s.symbol}</span>{' '}
                <span className="text-gray-500 dark:text-gray-400">
                  {s.name} · {s.exchange}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function InvestmentForm({ onSubmit, onCancel }) {
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(today())
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!symbol.trim() || !quantity || Number(quantity) <= 0 || !purchasePrice || Number(purchasePrice) < 0) {
      setError('Vul een symbool, aantal en aankoopprijs in.')
      return
    }
    const { error } = await onSubmit({
      symbol: symbol.trim(),
      name: name.trim(),
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice),
      purchaseDate,
    })
    if (error) setError(friendlyError(error, 'Opslaan mislukt.'))
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Symbool / ticker</label>
          <SymbolPicker
            symbol={symbol}
            setSymbol={setSymbol}
            onPick={(s) => {
              setSymbol(s.symbol)
              if (!name) setName(s.name)
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Naam (optioneel)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Apple Inc."
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Aantal</label>
          <input
            type="number"
            step="0.0001"
            min="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Aankoopprijs (per stuk)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Aankoopdatum</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">
          Opslaan
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-gray-300 px-4 py-1.5 text-sm dark:border-gray-600">
          Annuleren
        </button>
      </div>
    </form>
  )
}

function ManualPriceInput({ investment, onSetPrice }) {
  const [value, setValue] = useState(investment.current_price ? String(investment.current_price) : '')

  return (
    <span className="flex items-center gap-1">
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Koers"
        className="w-20 rounded-md border border-gray-300 px-2 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700"
      />
      <button
        onClick={() => value && onSetPrice(investment.id, Number(value))}
        className="rounded-md bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700"
      >
        Instellen
      </button>
    </span>
  )
}

function ApiKeyPanel() {
  const [key, setKey] = useState(getApiKey())
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(!getApiKey())

  function handleSave(e) {
    e.preventDefault()
    setApiKey(key.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold"
      >
        <span>Automatische koersen {getApiKey() ? '(sleutel ingesteld)' : '(nog niet ingesteld)'}</span>
        <span className="text-xs text-blue-600">{open ? 'Sluiten' : 'Instellen'}</span>
      </button>
      {open && (
        <form onSubmit={handleSave} className="mt-3 space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Maak een gratis account op{' '}
            <a
              href="https://twelvedata.com/pricing"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              twelvedata.com/pricing
            </a>{' '}
            en plak hier je API-key. Wordt enkel lokaal in jouw browser bewaard, niet gedeeld.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="API-key"
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
            />
            <button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
              Opslaan
            </button>
          </div>
          {saved && <p className="text-xs text-green-600">Opgeslagen.</p>}
        </form>
      )}
    </div>
  )
}

export default function Investments() {
  const { investments, loading, refreshingPrices, addInvestment, deleteInvestment, setManualPrice, refreshAllPrices } =
    useInvestments()
  const deletion = useUndoableDelete(deleteInvestment)

  const [formOpen, setFormOpen] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState('')

  async function handleRefreshPrices() {
    const { updated, failed, noKey } = await refreshAllPrices()
    if (noKey) {
      setRefreshMessage('Stel eerst je API-key in bij "Automatische koersen" hierboven.')
      return
    }
    setRefreshMessage(
      `${updated} koers(en) bijgewerkt${failed > 0 ? `, ${failed} niet gevonden (vul die manueel in)` : ''}.`,
    )
  }

  const rows = useMemo(
    () =>
      investments.map((inv) => {
        const cost = Number(inv.quantity) * Number(inv.purchase_price)
        const currentValue = inv.current_price ? Number(inv.quantity) * Number(inv.current_price) : null
        const gain = currentValue !== null ? currentValue - cost : null
        const gainPercent = currentValue !== null && cost > 0 ? (gain / cost) * 100 : null
        return { ...inv, cost, currentValue, gain, gainPercent }
      }),
    [investments],
  )

  const totals = useMemo(() => {
    const cost = rows.reduce((sum, r) => sum + r.cost, 0)
    const value = rows.reduce((sum, r) => sum + (r.currentValue ?? r.cost), 0)
    return { cost, value, gain: value - cost }
  }, [rows])

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Mijn beleggingsportefeuille</h1>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshPrices}
            disabled={refreshingPrices || investments.length === 0}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
          >
            {refreshingPrices ? 'Bezig...' : 'Koersen verversen'}
          </button>
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            {formOpen ? 'Sluiten' : '+ Positie toevoegen'}
          </button>
        </div>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Volledig privé — enkel jij ziet deze portefeuille. Geen live koppeling met je broker,
        maar met een gratis API-key kan de app koersen automatisch ophalen (of vul ze zelf in).
      </p>

      <ApiKeyPanel />

      {refreshMessage && (
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">{refreshMessage}</p>
      )}

      {formOpen && (
        <InvestmentForm
          onSubmit={async (payload) => {
            const result = await addInvestment(payload)
            if (!result.error) setFormOpen(false)
            return result
          }}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {!loading && investments.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Totaal ingelegd</div>
            <div className="text-xl font-semibold">{formatAmount(totals.cost)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Huidige waarde</div>
            <div className="text-xl font-semibold">{formatAmount(totals.value)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Winst / verlies</div>
            <div className={`text-xl font-semibold ${totals.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatAmount(totals.gain)}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Laden...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nog geen posities toegevoegd.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) =>
            deletion.isPending(r.id) ? (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
              >
                <span className="line-through">{r.name || r.symbol}</span>
                <button
                  onClick={() => deletion.undo(r.id)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Ongedaan maken
                </button>
              </li>
            ) : (
              <li
                key={r.id}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                  <span>
                    {r.name || r.symbol}{' '}
                    <span className="text-xs text-gray-500 dark:text-gray-400">({r.symbol})</span>
                  </span>
                  <button
                    onClick={() => deletion.scheduleDelete(r.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Verwijderen
                  </button>
                </div>
                <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  {r.quantity} stuks × {formatAmount(r.purchase_price)} aankoop ({r.purchase_date}) ={' '}
                  {formatAmount(r.cost)}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    {r.currentValue !== null ? (
                      <>
                        <span className="font-medium">{formatAmount(r.currentValue)}</span>{' '}
                        <span className={r.gain >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ({r.gain >= 0 ? '+' : ''}
                          {formatAmount(r.gain)} / {r.gainPercent.toFixed(1)}%)
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">Nog geen koers bekend</span>
                    )}
                  </div>
                  <ManualPriceInput investment={r} onSetPrice={setManualPrice} />
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}
