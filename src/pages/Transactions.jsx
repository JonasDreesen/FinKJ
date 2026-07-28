import { useEffect, useMemo, useRef, useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useTags } from '../hooks/useTags'
import { useTransactions } from '../hooks/useTransactions'
import { today } from '../lib/recurrence'
import { downloadCsv, parseCsv, toCsv } from '../lib/csv'
import { supabase } from '../lib/supabaseClient'
import { resizeImage } from '../lib/image'
import { useTemplates } from '../hooks/useTemplates'
import { friendlyError } from '../lib/errors'
import { useUndoableDelete } from '../hooks/useUndoableDelete'

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
  receiptPath: '',
}

async function uploadReceipt(file) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const blob = await resizeImage(file)
  const path = `${user.id}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('receipts').upload(path, blob, {
    contentType: 'image/jpeg',
  })
  if (error) throw error
  return path
}

async function getReceiptUrl(path) {
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 60)
  if (error) return null
  return data.signedUrl
}

function formatAmount(amount) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function RecurringEditForm({ template, categories, onSubmit, onCancel }) {
  const [amount, setAmount] = useState(String(template.amount))
  const [description, setDescription] = useState(template.description || '')
  const [categoryId, setCategoryId] = useState(template.category_id || '')
  const [isShared, setIsShared] = useState(template.is_shared)
  const [recurrenceInterval, setRecurrenceInterval] = useState(template.recurrence_interval)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(template.recurrence_end_date || '')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      setError('Vul een geldig bedrag in.')
      return
    }
    const { error } = await onSubmit({
      amount: Number(amount),
      description,
      category_id: categoryId || null,
      is_shared: isShared,
      recurrence_interval: recurrenceInterval,
      recurrence_end_date: recurrenceEndDate || null,
    })
    if (error) setError(friendlyError(error, 'Opslaan mislukt.'))
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 space-y-2 rounded-md border border-gray-200 p-3 dark:border-gray-600"
    >
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Wijzigingen gelden voor toekomstige boekingen, niet voor al gegenereerde boekingen.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Omschrijving"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
        >
          <option value="">Geen categorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={recurrenceInterval}
          onChange={(e) => setRecurrenceInterval(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
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
          value={recurrenceEndDate}
          onChange={(e) => setRecurrenceEndDate(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
        Gedeeld
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
          Opslaan
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600">
          Annuleren
        </button>
      </div>
    </form>
  )
}

function TransactionForm({ initial, categories, tags, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState(null)

  useEffect(() => {
    if (initial.receiptPath) {
      getReceiptUrl(initial.receiptPath).then(setReceiptUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleTag(tagId) {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(tagId)
        ? f.tagIds.filter((id) => id !== tagId)
        : [...f.tagIds, tagId],
    }))
  }

  async function handleReceiptChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingReceipt(true)
    setError('')
    try {
      const path = await uploadReceipt(file)
      setForm((f) => ({ ...f, receiptPath: path }))
      setReceiptUrl(await getReceiptUrl(path))
    } catch {
      setError('Uploaden van de foto is mislukt.')
    }
    setUploadingReceipt(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Vul een geldig bedrag in.')
      return
    }
    const { error } = await onSubmit(form)
    if (error) setError(friendlyError(error, 'Opslaan mislukt. Probeer opnieuw.'))
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

      <div>
        <label className="mb-1 block text-sm font-medium">Bonnetje (optioneel)</label>
        <input type="file" accept="image/*" capture="environment" onChange={handleReceiptChange} className="text-sm" />
        {uploadingReceipt && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Bezig met uploaden...</p>}
        {receiptUrl && !uploadingReceipt && (
          <a href={receiptUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-blue-600 hover:underline">
            Bekijk geüploade foto
          </a>
        )}
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
    confirmPendingReview,
    refresh,
  } = useTransactions()

  const { templates } = useTemplates()
  const transactionDeletion = useUndoableDelete(deleteTransaction)
  const recurringDeletion = useUndoableDelete(stopRecurring)
  const [formOpen, setFormOpen] = useState(false)
  const [formSeed, setFormSeed] = useState(emptyForm)
  const [formKey, setFormKey] = useState(0)
  const [editing, setEditing] = useState(null)
  const [scopeFilter, setScopeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [importMessage, setImportMessage] = useState('')
  const fileInputRef = useRef(null)
  const [recurringEditingId, setRecurringEditingId] = useState(null)

  function applyTemplate(tpl) {
    setEditing(null)
    setFormSeed({
      ...emptyForm,
      type: tpl.type,
      amount: String(tpl.amount),
      description: tpl.name,
      categoryId: tpl.category_id || '',
      isShared: tpl.is_shared,
    })
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }

  const pendingReview = useMemo(
    () => transactions.filter((t) => t.pending_review),
    [transactions],
  )

  const filtered = useMemo(() => {
    let result = transactions
    if (scopeFilter === 'personal') result = result.filter((t) => !t.is_shared)
    if (scopeFilter === 'shared') result = result.filter((t) => t.is_shared)

    const query = searchQuery.trim().toLowerCase()
    if (query) {
      result = result.filter((t) => (t.description || '').toLowerCase().includes(query))
    }

    const sorted = [...result]
    if (sortBy === 'date-desc') sorted.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
    if (sortBy === 'date-asc') sorted.sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))
    if (sortBy === 'amount-desc') sorted.sort((a, b) => Number(b.amount) - Number(a.amount))
    if (sortBy === 'amount-asc') sorted.sort((a, b) => Number(a.amount) - Number(b.amount))
    return sorted
  }, [transactions, scopeFilter, searchQuery, sortBy])

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
      receiptPath: form.receiptPath || null,
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
        receipt_path: form.receiptPath || null,
        pending_review: false,
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

  function handleExport() {
    const headers = ['datum', 'type', 'bedrag', 'omschrijving', 'categorie', 'scope', 'tags']
    const rows = transactions.map((t) => [
      t.occurred_on,
      t.type,
      t.amount,
      t.description || '',
      t.category?.name || '',
      t.is_shared ? 'gedeeld' : 'persoonlijk',
      (t.transaction_tags || []).map((tt) => tt.tags?.name).filter(Boolean).join(';'),
    ])
    downloadCsv(`transacties-${today()}.csv`, toCsv(headers, rows))
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const text = await file.text()
    const rows = parseCsv(text)
    if (rows.length === 0) {
      setImportMessage('Leeg of ongeldig bestand.')
      return
    }

    const header = rows[0].map((h) => h.trim().toLowerCase())
    const dataRows = rows.slice(1)

    const idx = {
      datum: header.indexOf('datum'),
      type: header.indexOf('type'),
      bedrag: header.indexOf('bedrag'),
      omschrijving: header.indexOf('omschrijving'),
      categorie: header.indexOf('categorie'),
      scope: header.indexOf('scope'),
      tags: header.indexOf('tags'),
    }

    if (idx.datum === -1 || idx.type === -1 || idx.bedrag === -1) {
      setImportMessage('CSV mist verplichte kolommen (datum, type, bedrag).')
      return
    }

    let imported = 0
    let skipped = 0

    for (const row of dataRows) {
      const amount = Number(row[idx.bedrag])
      const type = row[idx.type]?.trim()
      const occurredOn = row[idx.datum]?.trim()
      if (!amount || amount <= 0 || (type !== 'income' && type !== 'expense') || !occurredOn) {
        skipped += 1
        continue
      }
      const categoryName = idx.categorie !== -1 ? row[idx.categorie]?.trim() : ''
      const category = categories.find((c) => c.name === categoryName)
      const isShared = idx.scope !== -1 && row[idx.scope]?.trim().toLowerCase() === 'gedeeld'

      const { error } = await supabase.from('transactions').insert({
        type,
        amount,
        description: idx.omschrijving !== -1 ? row[idx.omschrijving] : '',
        category_id: category?.id || null,
        occurred_on: occurredOn,
        is_shared: isShared,
      })
      if (error) skipped += 1
      else imported += 1
    }

    setImportMessage(`${imported} transactie(s) geïmporteerd, ${skipped} overgeslagen.`)
    await refresh()
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Transacties</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
          >
            Exporteren (CSV)
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
          >
            Importeren (CSV)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => {
              setEditing(null)
              setFormSeed(emptyForm)
              setFormKey((k) => k + 1)
              setFormOpen((v) => !v)
            }}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            {formOpen ? 'Sluiten' : '+ Nieuwe transactie'}
          </button>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => applyTemplate(tpl)}
              className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200"
            >
              ⚡ {tpl.name}
            </button>
          ))}
        </div>
      )}

      {importMessage && (
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">{importMessage}</p>
      )}

      {pendingReview.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <h2 className="mb-2 font-semibold text-amber-800 dark:text-amber-200">
            Te bevestigen ({pendingReview.length})
          </h2>
          <p className="mb-2 text-xs text-amber-800 dark:text-amber-200">
            Automatisch aangemaakt vanuit een terugkerende reeks. Controleer het bedrag en
            bevestig, of pas aan indien het deze keer afwijkt.
          </p>
          <ul className="space-y-1">
            {pendingReview.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm text-amber-900 dark:text-amber-100">
                <span>
                  {t.description || '(geen omschrijving)'} — {formatAmount(t.amount)} ({t.occurred_on})
                </span>
                <span className="flex gap-2">
                  <button onClick={() => startEdit(t)} className="text-xs text-blue-600 hover:underline">
                    Aanpassen
                  </button>
                  <button
                    onClick={() => confirmPendingReview(t.id)}
                    className="text-xs text-green-700 hover:underline dark:text-green-400"
                  >
                    Bevestigen
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {formOpen && (
        <TransactionForm
          key={formKey}
          initial={formSeed}
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
            receiptPath: editing.receipt_path || '',
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
              <li key={tmpl.id} className="text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    {tmpl.description || '(geen omschrijving)'} — {formatAmount(tmpl.amount)} (
                    {tmpl.recurrence_interval === 'weekly' && 'wekelijks'}
                    {tmpl.recurrence_interval === 'monthly' && 'maandelijks'}
                    {tmpl.recurrence_interval === 'yearly' && 'jaarlijks'})
                  </span>
                  <span className="flex gap-2">
                    {recurringDeletion.isPending(tmpl.id) ? (
                      <button
                        onClick={() => recurringDeletion.undo(tmpl.id)}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Ongedaan maken
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            setRecurringEditingId((id) => (id === tmpl.id ? null : tmpl.id))
                          }
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {recurringEditingId === tmpl.id ? 'Sluiten' : 'Bewerken'}
                        </button>
                        <button
                          onClick={() => recurringDeletion.scheduleDelete(tmpl.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Stoppen
                        </button>
                      </>
                    )}
                  </span>
                </div>
                {recurringEditingId === tmpl.id && (
                  <RecurringEditForm
                    template={tmpl}
                    categories={categories}
                    onSubmit={async (fields) => {
                      const result = await updateTransaction(tmpl.id, fields)
                      if (!result.error) setRecurringEditingId(null)
                      return result
                    }}
                    onCancel={() => setRecurringEditingId(null)}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
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
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Zoeken op omschrijving..."
          className="rounded-md border border-gray-300 px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
        >
          <option value="date-desc">Datum (nieuw → oud)</option>
          <option value="date-asc">Datum (oud → nieuw)</option>
          <option value="amount-desc">Bedrag (hoog → laag)</option>
          <option value="amount-asc">Bedrag (laag → hoog)</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Laden...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nog geen transacties.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {filtered.map((t) =>
            transactionDeletion.isPending(t.id) ? (
              <li key={t.id} className="flex items-center justify-between bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <span className="line-through">{t.description || '(geen omschrijving)'}</span>
                <button
                  onClick={() => transactionDeletion.undo(t.id)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Ongedaan maken
                </button>
              </li>
            ) : (
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
                    {t.pending_review && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900 dark:text-red-200">
                        Te bevestigen
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
                  {t.receipt_path && (
                    <button
                      onClick={async () => {
                        const url = await getReceiptUrl(t.receipt_path)
                        if (url) window.open(url, '_blank')
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Bon
                    </button>
                  )}
                  <button onClick={() => startEdit(t)} className="text-xs text-blue-600 hover:underline">
                    Bewerken
                  </button>
                  <button
                    onClick={() => transactionDeletion.scheduleDelete(t.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Verwijderen
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}
