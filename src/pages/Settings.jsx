import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useTags } from '../hooks/useTags'
import { useTemplates } from '../hooks/useTemplates'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/errors'
import { downloadJson, fetchFullBackup } from '../lib/backup'
import { useUndoableDelete } from '../hooks/useUndoableDelete'

function formatAmount(amount) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function NameList({ title, items, onAdd, onDelete, currentUserId }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const deletion = useUndoableDelete(onDelete)

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    const { error } = await onAdd(name.trim())
    if (error) {
      setError(friendlyError(error, 'Kon niet toevoegen.'))
    } else {
      setError('')
      setName('')
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <form onSubmit={handleAdd} className="mb-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Naam"
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Toevoegen
        </button>
      </form>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="space-y-1">
        {items.map((item) =>
          deletion.isPending(item.id) ? (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1 text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400"
            >
              <span className="line-through">{item.name}</span>
              <button
                onClick={() => deletion.undo(item.id)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Ongedaan maken
              </button>
            </li>
          ) : (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span>{item.name}</span>
              {item.user_id === currentUserId && (
                <button
                  onClick={() => deletion.scheduleDelete(item.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Verwijderen
                </button>
              )}
            </li>
          ),
        )}
        {items.length === 0 && <li className="text-sm text-gray-400">Nog niets toegevoegd.</li>}
      </ul>
    </div>
  )
}

function TemplateManager({ categories, currentUserId }) {
  const { templates, addTemplate, deleteTemplate } = useTemplates()
  const deletion = useUndoableDelete(deleteTemplate)
  const [name, setName] = useState('')
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim() || !amount || Number(amount) <= 0) {
      setError('Vul een naam en een geldig bedrag in.')
      return
    }
    const { error } = await addTemplate({
      name: name.trim(),
      type,
      amount: Number(amount),
      categoryId,
      isShared,
    })
    if (error) {
      setError(friendlyError(error, 'Kon niet toevoegen.'))
    } else {
      setError('')
      setName('')
      setAmount('')
      setCategoryId('')
      setIsShared(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-1 font-semibold">Sjablonen</h2>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Voor kosten/inkomens die iedereen heeft, zoals loon, huur of abonnementen. Zichtbaar voor
        jullie beiden; met één klik vooraf ingevuld op de Transacties-pagina.
      </p>
      <form onSubmit={handleAdd} className="mb-3 space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Naam (bv. Loon, Huur)"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
          />
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Bedrag (€)"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
          >
            <option value="expense">Uitgave</option>
            <option value="income">Inkomst</option>
          </select>
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
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
          Standaard gedeeld
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Sjabloon toevoegen
        </button>
      </form>
      <ul className="space-y-1">
        {templates.map((tpl) =>
          deletion.isPending(tpl.id) ? (
            <li
              key={tpl.id}
              className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1 text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400"
            >
              <span className="line-through">{tpl.name}</span>
              <button
                onClick={() => deletion.undo(tpl.id)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Ongedaan maken
              </button>
            </li>
          ) : (
            <li
              key={tpl.id}
              className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span>
                {tpl.name} — {formatAmount(tpl.amount)} ({tpl.type === 'income' ? 'inkomst' : 'uitgave'})
              </span>
              {tpl.user_id === currentUserId && (
                <button
                  onClick={() => deletion.scheduleDelete(tpl.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Verwijderen
                </button>
              )}
            </li>
          ),
        )}
        {templates.length === 0 && <li className="text-sm text-gray-400">Nog geen sjablonen.</li>}
      </ul>
    </div>
  )
}

export default function Settings() {
  const { session } = useAuth()
  const { categories, addCategory, deleteCategory } = useCategories()
  const { tags, addTag, deleteTag } = useTags()
  const [backupBusy, setBackupBusy] = useState(false)

  async function handleBackup() {
    setBackupBusy(true)
    const data = await fetchFullBackup()
    downloadJson(`finkj-backup-${new Date().toISOString().slice(0, 10)}.json`, data)
    setBackupBusy(false)
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Instellingen</h1>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Categorieën, tags en sjablonen zijn zichtbaar voor jullie beiden, maar enkel de maker kan
        ze verwijderen.
      </p>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <NameList
          title="Categorieën"
          items={categories}
          onAdd={addCategory}
          onDelete={deleteCategory}
          currentUserId={session?.user?.id}
        />
        <NameList
          title="Tags"
          items={tags}
          onAdd={addTag}
          onDelete={deleteTag}
          currentUserId={session?.user?.id}
        />
      </div>
      <TemplateManager categories={categories} currentUserId={session?.user?.id} />

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-1 font-semibold">Volledige back-up</h2>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Download al je zichtbare data (categorieën, tags, transacties, budgetten, spaardoelen,
          sjablonen) als één JSON-bestand. Handig als extra vangnet naast Supabase zelf.
        </p>
        <button
          onClick={handleBackup}
          disabled={backupBusy}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
        >
          {backupBusy ? 'Bezig...' : 'Back-up downloaden (JSON)'}
        </button>
      </div>
    </div>
  )
}
