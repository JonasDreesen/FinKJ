import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useTags } from '../hooks/useTags'
import { useAuth } from '../context/AuthContext'

function NameList({ title, items, onAdd, onDelete, currentUserId }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    const { error } = await onAdd(name.trim())
    if (error) {
      setError('Kon niet toevoegen (bestaat deze naam al?)')
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
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span>{item.name}</span>
            {item.user_id === currentUserId && (
              <button
                onClick={() => onDelete(item.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Verwijderen
              </button>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-gray-400">Nog niets toegevoegd.</li>}
      </ul>
    </div>
  )
}

export default function Settings() {
  const { session } = useAuth()
  const { categories, addCategory, deleteCategory } = useCategories()
  const { tags, addTag, deleteTag } = useTags()

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Instellingen</h1>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Categorieën en tags zijn zichtbaar voor jullie beiden, maar enkel de maker kan ze
        verwijderen.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
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
    </div>
  )
}
