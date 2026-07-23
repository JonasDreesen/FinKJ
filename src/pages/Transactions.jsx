import { useMemo, useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useTags } from '../hooks/useTags'
import { useTransactions } from '../hooks/useTransactions'
import { today } from '../lib/recurrence'

const emptyForm = {
  type: 'expense',
  amount: '',
  description: '',
  categoryId: '',
  occurredOn: today(),
  isShared: false,
  tagIds: [],
  isRecurring: false,
  recurrenceInterval: 'monthly',
  recurrenceEndDate: '',
}

function formatAmount(amount) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function TransactionForm({ initial, categories, tags, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')

  function toggleTag(tagId) {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(tagId)
        ? f.tagIds.filter((id) => id !== tagId)
        : [...f.tagIds, tagId],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Vul een geldig bedrag in.')
      return
    }
    const { error } = await onSubmit(form)
    if (error) setError('Opslaan mislukt. Probeer opnieuw.')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex gap-4">
        <label className="flex items-center gap-1 text-sm">
          <input
            type="radio"
            checked={form.type === 'expense'}
            onChange={() => setForm((f) => ({ ...f, type: 'expense' }))}
          />
          Uitgave
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="radio"
            checked={form.type === 'income'}
            onChange={() => setForm((f) => ({ ...f, type: 'income' }))}
          />
          Inkomst
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Bedrag (€)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Datum</label>
          <input
            type="date"
            value={form.occurredOn}
            onChange={(e) => setForm((f) => ({ ...f, occurredOn: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Omschrijving</label>
        <input
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Categorie</label>
        <select
          value={form.categoryId}
          onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
        >
          <option value="">Geen</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {tags.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium">Tags</label>
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={form.tagIds.includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                />
                {tag.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isShared}
          onChange={(e) => setForm((f) => ({ ...f, isShared: e.target.checked }))}
        />
        Gedeelde transactie (zichtbaar voor jullie beiden)
      </label>

      {!initial.id && (
        <div className="rounded-md border border-gray-200 p-3 dark:border-gray-600">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
            />
            Terugkerende transactie
          </label>
          {form.isRecurring && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm">Herhaling</label>
                <select
                  value={form.recurrenceInterval}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, recurrenceInterval: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value="weekly">Wekelijks</option>
                  <option value="monthly">Maandelijks</option>
                  <option value="yearly">Jaarlijks</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Einddatum (optioneel)</label>
                <input
                  type="date"
                  value={form.recurrenceEndDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, recurrenceEndDate: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Opslaan
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm dark:border-gray-600"
        >
          Annuleren
        </button>
      </div>
    </form>
  )
}

export default function Transactions() {
  const { categories } = useCategories()
  const { tags } = useTags()
  const {
    transactions,
    recurringTemplates,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    stopRecurring,
  } = useTransactions()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [scopeFilter, setScopeFilter] = useState('all')

  const filtered = useMemo(() => {
    if (scopeFilter === 'personal') return transactions.filter((t) => !t.is_shared)
    if (scopeFilter === 'shared') return transactions.filter((t) => t.is_shared)
    return transactions
  }, [transactions, scopeFilter])

  async function handleAdd(form) {
    const result = await addTransaction({
      type: form.type,
      amount: Number(form.amount),
      description: form.description,
      categoryId: form.categoryId,
      occurredOn: form.occurredOn,
      isShared: form.isShared,
      tagIds: form.tagIds,
      isRecurring: form.isRecurring,
      recurrenceInterval: form.recurrenceInterval,
      recurrenceEndDate: form.recurrenceEndDate,
    })
    if (!result.error) {
      setFormOpen(false)
    }
    return result
  }

  async function handleEditSubmit(form) {
    const result = await updateTransaction(
      editing.id,
      {
        type: form.type,
        amount: Number(form.amount),
        description: form.description,
        category_id: form.categoryId || null,
        occurred_on: form.occurredOn,
        is_shared: form.isShared,
      },
      form.tagIds,
    )
    if (!result.error) setEditing(null)
    return result
  }

  function startEdit(t) {
    setEditing(t)
    setFormOpen(false)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transacties</h1>
        <button
          onClick={() => {
            setEditing(null)
            setFormOpen((v) => !v)
          }}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          {formOpen ? 'Sluiten' : '+ Nieuwe transactie'}
        </button>
      </div>

      {formOpen && (
        <TransactionForm
          initial={emptyForm}
          categories={categories}
          tags={tags}
          onSubmit={handleAdd}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {editing && (
        <TransactionForm
          initial={{
            id: editing.id,
            type: editing.type,
            amount: String(editing.amount),
            description: editing.description || '',
            categoryId: editing.category_id || '',
            occurredOn: editing.occurred_on,
            isShared: editing.is_shared,
            tagIds: editing.transaction_tags?.map((tt) => tt.tag_id) || [],
            isRecurring: false,
            recurrenceInterval: 'monthly',
            recurrenceEndDate: '',
          }}
          categories={categories}
          tags={tags}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditing(null)}
        />
      )}

      {recurringTemplates.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-2 font-semibold">Actieve terugkerende reeksen</h2>
          <ul className="space-y-1">
            {recurringTemplates.map((tmpl) => (
              <li key={tmpl.id} className="flex items-center justify-between text-sm">
                <span>
                  {tmpl.description || '(geen omschrijving)'} — {formatAmount(tmpl.amount)} (
                  {tmpl.recurrence_interval === 'weekly' && 'wekelijks'}
                  {tmpl.recurrence_interval === 'monthly' && 'maandelijks'}
                  {tmpl.recurrence_interval === 'yearly' && 'jaarlijks'})
                </span>
                <button
                  onClick={() => stopRecurring(tmpl.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Stoppen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-3 flex gap-2 text-sm">
        {[
          { key: 'all', label: 'Alles' },
          { key: 'personal', label: 'Persoonlijk' },
          { key: 'shared', label: 'Gedeeld' },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setScopeFilter(opt.key)}
            className={`rounded-md px-3 py-1 ${
              scopeFilter === opt.key
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 dark:border-gray-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Laden...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">Nog geen transacties.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {filtered.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{t.description || '(geen omschrijving)'}</span>
                  {t.category && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700">
                      {t.category.name}
                    </span>
                  )}
                  {t.is_shared && (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                      Gedeeld
                    </span>
                  )}
                  {t.parent_transaction_id && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                      Terugkerend
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t.occurred_on}</div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    t.type === 'income'
                      ? 'font-semibold text-green-600'
                      : 'font-semibold text-red-600'
                  }
                >
                  {t.type === 'income' ? '+' : '-'}
                  {formatAmount(t.amount)}
                </span>
                <button onClick={() => startEdit(t)} className="text-xs text-blue-600 hover:underline">
                  Bewerken
                </button>
                <button
                  onClick={() => deleteTransaction(t.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Verwijderen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
