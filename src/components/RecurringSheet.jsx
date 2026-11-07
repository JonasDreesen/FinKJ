import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Field, Segmented, Sheet, Switch } from './ui'
import { useCategories, useMembers } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { parseAmount } from '../lib/format'
import * as api from '../lib/api'

export default function RecurringSheet({ item, onClose }) {
  const { user } = useAuth()
  const { categories } = useCategories()
  const { me, partner } = useMembers()
  const { toast, showError, removeWithUndo } = useToast()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (item) {
      setForm({
        amount: String(item.amount).replace('.', ','),
        description: item.description || '',
        category_id: item.category_id || '',
        is_shared: item.is_shared,
        paid_by: item.paid_by || item.user_id,
        recurrence_interval: item.recurrence_interval,
        recurrence_end_date: item.recurrence_end_date || '',
      })
    }
  }, [item])

  if (!item || !form) return null
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  async function submit(e) {
    e.preventDefault()
    const amount = parseAmount(form.amount)
    if (!(amount > 0)) return showError(null, 'Vul een geldig bedrag in.')
    setSaving(true)
    try {
      await api.updateRecurring(item.id, { ...form, amount })
      toast('Reeks bijgewerkt — geldt voor de volgende boekingen')
      onClose()
    } catch (error) {
      showError(error, 'Opslaan mislukt.')
    } finally {
      setSaving(false)
    }
  }

  function stop() {
    onClose()
    removeWithUndo({
      key: item.id,
      message: 'Reeks gestopt',
      commit: () => api.deleteTransaction(item, user.id),
    })
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Vaste last bewerken"
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn btn-danger" onClick={stop}>
            <Trash2 size={17} /> Stoppen
          </button>
          <button form="recurring-form" className="btn btn-primary flex-1" disabled={saving}>
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      }
    >
      <form id="recurring-form" onSubmit={submit} className="space-y-4">
        <p className="rounded-2xl bg-surface-2 p-3 text-xs text-muted">
          Wijzigingen gelden voor toekomstige boekingen. Al aangemaakte boekingen pas je aan bij Transacties.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bedrag (€)">
            <input className="input money" inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
          </Field>
          <Field label="Categorie">
            <select className="input" value={form.category_id} onChange={(e) => set({ category_id: e.target.value })}>
              <option value="">Geen</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Omschrijving">
          <input className="input" maxLength={300} value={form.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <Segmented
          className="w-full"
          value={form.recurrence_interval}
          onChange={(recurrence_interval) => set({ recurrence_interval })}
          options={[
            { value: 'weekly', label: 'Wekelijks' },
            { value: 'monthly', label: 'Maandelijks' },
            { value: 'yearly', label: 'Jaarlijks' },
          ]}
        />
        <Field label="Einddatum (optioneel)">
          <input type="date" className="input" value={form.recurrence_end_date} onChange={(e) => set({ recurrence_end_date: e.target.value })} />
        </Field>
        <Switch checked={form.is_shared} onChange={(is_shared) => set({ is_shared })} label="Gedeelde kost" />
        {form.is_shared && partner && item.type === 'expense' && (
          <Segmented
            className="w-full"
            value={form.paid_by}
            onChange={(paid_by) => set({ paid_by })}
            options={[
              { value: user.id, label: `Betaald door ${me?.display_name || 'mij'}` },
              { value: partner.user_id, label: `door ${partner.display_name}` },
            ]}
          />
        )}
      </form>
    </Sheet>
  )
}
