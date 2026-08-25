import { useMemo, useState } from 'react'
import { useInvestments } from '../hooks/useInvestments'
import { useUndoableDelete } from '../hooks/useUndoableDelete'
import { friendlyError } from '../lib/errors'
import { today } from '../lib/recurrence'

function formatAmount(amount) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount)
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
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="AAPL.US"
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
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

export default function Investments() {
  const { investments, loading, addInvestment, deleteInvestment, setManualPrice } = useInvestments()
  const deletion = useUndoableDelete(deleteInvestment)

  const [formOpen, setFormOpen] = useState(false)

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
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          {formOpen ? 'Sluiten' : '+ Positie toevoegen'}
        </button>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Volledig privé — enkel jij ziet deze portefeuille. Er is geen live koppeling met je
        broker: vul de actuele koers per positie hieronder zelf in (bv. via de app van je broker
        of Google) en klik op "Instellen" om je winst/verlies bij te werken.
      </p>

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
