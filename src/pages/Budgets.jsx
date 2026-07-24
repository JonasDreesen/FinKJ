import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useBudgets } from '../hooks/useBudgets'
import { useSavingsGoals } from '../hooks/useSavingsGoals'
import { monthStart, shiftMonth, formatMonthLabel } from '../lib/month'

function formatAmount(amount) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function barColor(percent) {
  if (percent >= 100) return 'bg-red-500'
  if (percent >= 80) return 'bg-amber-500'
  return 'bg-green-500'
}

function BudgetForm({ categories, onSubmit, onCancel }) {
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [rollover, setRollover] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!categoryId || !amount || Number(amount) < 0) {
      setError('Kies een categorie en vul een geldig bedrag in.')
      return
    }
    const { error } = await onSubmit({ categoryId, amount: Number(amount), isShared, rollover })
    if (error) {
      setError('Opslaan mislukt (bestaat er al een budget voor deze categorie deze maand?)')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Categorie</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
          >
            <option value="">Kies...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Budget (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
        Gedeeld budget
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={rollover} onChange={(e) => setRollover(e.target.checked)} />
        Overschot/tekort meenemen naar volgende maand
      </label>
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

function GoalForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !targetAmount || Number(targetAmount) <= 0) {
      setError('Vul een naam en een geldig doelbedrag in.')
      return
    }
    const { error } = await onSubmit({ name: name.trim(), targetAmount: Number(targetAmount), isShared, targetDate })
    if (error) setError('Opslaan mislukt.')
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Naam</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Doelbedrag (€)</label>
          <input type="number" step="0.01" min="0.01" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Streefdatum (optioneel)</label>
        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
        Gedeeld spaardoel
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">Opslaan</button>
        <button type="button" onClick={onCancel} className="rounded-md border border-gray-300 px-4 py-1.5 text-sm dark:border-gray-600">Annuleren</button>
      </div>
    </form>
  )
}

function GoalRow({ goal, onUpdateAmount, onDelete }) {
  const [amount, setAmount] = useState(String(goal.current_amount))
  const percent = Math.min(100, (goal.current_amount / goal.target_amount) * 100)

  return (
    <li className="rounded-md border border-gray-200 p-3 dark:border-gray-600">
      <div className="mb-1 flex items-center justify-between text-sm font-medium">
        <span>
          {goal.name} {goal.is_shared && <span className="ml-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-200">Gedeeld</span>}
        </span>
        <button onClick={() => onDelete(goal.id)} className="text-xs text-red-600 hover:underline">Verwijderen</button>
      </div>
      <div className="mb-1 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {formatAmount(goal.current_amount)} / {formatAmount(goal.target_amount)} ({percent.toFixed(0)}%)
          {goal.target_date && ` — streefdatum ${goal.target_date}`}
        </span>
        <span className="flex items-center gap-1">
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-24 rounded-md border border-gray-300 px-2 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700"
          />
          <button
            onClick={() => onUpdateAmount(goal.id, Number(amount))}
            className="rounded-md bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700"
          >
            Bijwerken
          </button>
        </span>
      </div>
    </li>
  )
}

export default function Budgets() {
  const [monthDate, setMonthDate] = useState(monthStart())
  const { categories } = useCategories()
  const { lines, loading, addBudget, deleteBudget } = useBudgets(monthDate)
  const { goals, addGoal, updateGoalAmount, deleteGoal } = useSavingsGoals()

  const [budgetFormOpen, setBudgetFormOpen] = useState(false)
  const [goalFormOpen, setGoalFormOpen] = useState(false)

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Budgetten</h1>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMonthDate((d) => shiftMonth(d, -1))}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600"
          >
            ← Vorige
          </button>
          <span className="text-sm font-medium capitalize">{formatMonthLabel(monthDate)}</span>
          <button
            onClick={() => setMonthDate((d) => shiftMonth(d, 1))}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600"
          >
            Volgende →
          </button>
        </div>
        <button
          onClick={() => setBudgetFormOpen((v) => !v)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          {budgetFormOpen ? 'Sluiten' : '+ Budget instellen'}
        </button>
      </div>

      {budgetFormOpen && (
        <BudgetForm
          categories={categories}
          onSubmit={async (payload) => {
            const result = await addBudget(payload)
            if (!result.error) setBudgetFormOpen(false)
            return result
          }}
          onCancel={() => setBudgetFormOpen(false)}
        />
      )}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Laden...</p>
      ) : lines.length === 0 ? (
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Nog geen budgetten ingesteld voor deze maand.</p>
      ) : (
        <ul className="mb-6 space-y-3">
          {lines.map((line) => (
            <li key={line.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-1 flex items-center justify-between text-sm font-medium">
                <span>
                  {line.category?.name || 'Onbekende categorie'}{' '}
                  {line.is_shared && (
                    <span className="ml-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                      Gedeeld
                    </span>
                  )}
                  {line.rollover && (
                    <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                      Rollover
                    </span>
                  )}
                </span>
                <button onClick={() => deleteBudget(line.id)} className="text-xs text-red-600 hover:underline">
                  Verwijderen
                </button>
              </div>
              <div className="mb-1 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  className={`h-2 rounded-full ${barColor(line.percent)}`}
                  style={{ width: `${Math.min(100, line.percent)}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatAmount(line.spent)} van {formatAmount(line.effectiveBudget)} besteed
                {line.rolloverAmount !== 0 &&
                  ` (waarvan ${formatAmount(line.rolloverAmount)} meegenomen uit vorige maand)`}
                {' — '}
                {line.leftover >= 0
                  ? `${formatAmount(line.leftover)} over`
                  : `${formatAmount(Math.abs(line.leftover))} overschreden`}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Spaardoelen</h2>
        <button
          onClick={() => setGoalFormOpen((v) => !v)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          {goalFormOpen ? 'Sluiten' : '+ Spaardoel'}
        </button>
      </div>

      {goalFormOpen && (
        <GoalForm
          onSubmit={async (payload) => {
            const result = await addGoal(payload)
            if (!result.error) setGoalFormOpen(false)
            return result
          }}
          onCancel={() => setGoalFormOpen(false)}
        />
      )}

      {goals.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nog geen spaardoelen.</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} onUpdateAmount={updateGoalAmount} onDelete={deleteGoal} />
          ))}
        </ul>
      )}
    </div>
  )
}
