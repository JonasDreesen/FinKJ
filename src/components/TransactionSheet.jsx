import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ExternalLink, Repeat, Sparkles, Trash2, Zap } from 'lucide-react'
import { AmountInput, Field, Segmented, Sheet, Switch } from './ui'
import { useCategories, useMembers, useTags, useTemplates, useTransactions } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import * as api from '../lib/api'
import { parseAmount } from '../lib/format'
import { todayISO } from '../lib/dates'
import { categoryColor, suggestCategory } from '../lib/categories'
import { extractReceiptText, guessAmountFromText, guessDateFromText, guessMerchantFromText } from '../lib/ocr'

function blankForm(userId) {
  return {
    type: 'expense',
    amount: '',
    description: '',
    category_id: '',
    occurred_on: todayISO(),
    is_shared: false,
    paid_by: userId,
    tag_ids: [],
    receipt_path: '',
    receipt_text: '',
    is_recurring: false,
    recurrence_interval: 'monthly',
    recurrence_end_date: '',
  }
}

function fromTransaction(t) {
  return {
    id: t.id,
    type: t.type,
    amount: String(t.amount).replace('.', ','),
    description: t.description || '',
    category_id: t.category_id || '',
    occurred_on: t.occurred_on,
    is_shared: t.is_shared,
    paid_by: t.paid_by || t.user_id,
    tag_ids: (t.transaction_tags || []).map((tt) => tt.tag_id),
    receipt_path: t.receipt_path || '',
    receipt_text: t.receipt_text || '',
    pending_review: t.pending_review,
    user_id: t.user_id,
    is_recurring: false,
  }
}

export default function TransactionSheet({ open, onClose, transaction, preset }) {
  const { user } = useAuth()
  const { categories } = useCategories()
  const { tags } = useTags()
  const { templates } = useTemplates()
  const { transactions } = useTransactions()
  const { me, partner } = useMembers()
  const { toast, showError, removeWithUndo } = useToast()

  const [form, setForm] = useState(() => blankForm(user?.id))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [ocr, setOcr] = useState(null) // null | {stage, progress}
  const [suggestedId, setSuggestedId] = useState(null)
  const uploadedThisSession = useRef(null)
  const fileRef = useRef(null)

  const editing = Boolean(transaction?.id)

  useEffect(() => {
    if (!open) return
    uploadedThisSession.current = null
    setErrors({})
    setSuggestedId(null)
    setOcr(null)
    if (transaction) setForm(fromTransaction(transaction))
    else setForm({ ...blankForm(user?.id), ...(preset || {}) })
  }, [open, transaction, preset, user?.id])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const sortedCategories = useMemo(() => {
    const usage = new Map()
    for (const t of transactions.slice(0, 300)) {
      if (t.category_id && t.type === form.type) usage.set(t.category_id, (usage.get(t.category_id) || 0) + 1)
    }
    return [...categories].sort((a, b) => (usage.get(b.id) || 0) - (usage.get(a.id) || 0) || a.name.localeCompare(b.name))
  }, [categories, transactions, form.type])

  function updateDescription(description) {
    set({ description })
    if (!form.category_id) setSuggestedId(suggestCategory(description, transactions))
  }

  function applyTemplate(tpl) {
    set({
      type: tpl.type,
      amount: String(tpl.amount).replace('.', ','),
      description: tpl.name,
      category_id: tpl.category_id || '',
      is_shared: tpl.is_shared,
    })
  }

  async function handleReceipt(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setOcr({ stage: 'Foto uploaden…', progress: 0 })
      const path = await api.uploadReceipt(file, user.id)
      if (uploadedThisSession.current) api.removeReceipt(uploadedThisSession.current)
      uploadedThisSession.current = path
      set({ receipt_path: path })

      setOcr({ stage: 'Tekst herkennen…', progress: 0 })
      const text = await extractReceiptText(file, (p) => setOcr({ stage: 'Tekst herkennen…', progress: p }))
      if (text) {
        setForm((f) => {
          const amount = guessAmountFromText(text)
          const merchant = guessMerchantFromText(text)
          const date = guessDateFromText(text)
          return {
            ...f,
            receipt_text: text,
            amount: f.amount || (amount ? String(amount).replace('.', ',') : ''),
            description: f.description || merchant,
            occurred_on: date && f.occurred_on === todayISO() ? date : f.occurred_on,
          }
        })
        if (!form.category_id) {
          setSuggestedId(suggestCategory(`${form.description} ${guessMerchantFromText(text)}`, transactions))
        }
        toast('Bonnetje gelezen — controleer de ingevulde gegevens.')
      }
    } catch (error) {
      showError(error, 'Bonnetje verwerken mislukt.')
    } finally {
      setOcr(null)
    }
  }

  async function viewReceipt() {
    try {
      const url = await api.getReceiptUrl(form.receipt_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      showError(error, 'Kon het bonnetje niet openen.')
    }
  }

  function close() {
    if (uploadedThisSession.current && !saving) api.removeReceipt(uploadedThisSession.current)
    onClose()
  }

  async function submit(e) {
    e?.preventDefault()
    const amount = parseAmount(form.amount)
    const nextErrors = {}
    if (!(amount > 0)) nextErrors.amount = 'Vul een bedrag groter dan 0 in.'
    else if (amount > 100_000_000) nextErrors.amount = 'Dat bedrag is te groot.'
    if (!form.occurred_on) nextErrors.date = 'Kies een datum.'
    if (form.description.length > 300) nextErrors.description = 'Maximaal 300 tekens.'
    if (form.is_recurring && form.recurrence_end_date && form.recurrence_end_date < form.occurred_on) {
      nextErrors.end = 'Einddatum ligt vóór de startdatum.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSaving(true)
    try {
      const original = transaction?.receipt_path
      await api.saveTransaction({ ...form, amount })
      if (original && original !== form.receipt_path && original.startsWith(`${user.id}/`)) {
        api.removeReceipt(original)
      }
      uploadedThisSession.current = null
      toast(editing ? 'Wijziging opgeslagen' : form.is_recurring ? 'Terugkerende reeks gestart' : 'Toegevoegd')
      onClose()
    } catch (error) {
      showError(error, 'Opslaan mislukt.')
    } finally {
      setSaving(false)
    }
  }

  function remove() {
    const t = transaction
    onClose()
    removeWithUndo({
      key: t.id,
      message: 'Transactie verwijderd',
      commit: () => api.deleteTransaction(t, user.id),
    })
  }

  const suggested = suggestedId && !form.category_id ? categories.find((c) => c.id === suggestedId) : null
  const tone = form.type === 'income' ? 'income' : 'expense'

  return (
    <Sheet
      open={open}
      onClose={close}
      title={editing ? (form.pending_review ? 'Controleren en bevestigen' : 'Transactie bewerken') : 'Nieuwe transactie'}
      footer={
        <div className="flex items-center gap-2">
          {editing && (
            <button type="button" className="btn btn-danger px-4" onClick={remove} aria-label="Verwijderen">
              <Trash2 size={18} />
            </button>
          )}
          <button type="submit" form="tx-form" className="btn btn-primary flex-1" disabled={saving || Boolean(ocr)}>
            {saving ? 'Opslaan…' : form.pending_review ? 'Bevestigen' : 'Opslaan'}
          </button>
        </div>
      }
    >
      <form id="tx-form" onSubmit={submit} className="space-y-5">
        {!editing && templates.length > 0 && (
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="chip shrink-0 border border-brand-200 bg-brand-50 py-1.5 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200"
              >
                <Zap size={13} /> {tpl.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center">
          <Segmented
            value={form.type}
            onChange={(type) => set({ type })}
            options={[
              { value: 'expense', label: 'Uitgave' },
              { value: 'income', label: 'Inkomst' },
            ]}
          />
        </div>

        <div>
          <AmountInput value={form.amount} onChange={(amount) => set({ amount })} autoFocus={!editing} tone={tone} />
          {errors.amount && <p className="text-center text-xs font-medium text-expense">{errors.amount}</p>}
        </div>

        <Field label="Omschrijving" error={errors.description}>
          <input
            className="input"
            value={form.description}
            maxLength={300}
            placeholder={form.type === 'income' ? 'bv. Loon' : 'bv. Delhaize'}
            onChange={(e) => updateDescription(e.target.value)}
          />
        </Field>

        <div>
          <span className="label">Categorie</span>
          {suggested && (
            <button
              type="button"
              onClick={() => {
                set({ category_id: suggested.id })
                setSuggestedId(null)
              }}
              className="mb-2 flex w-full items-center gap-2 rounded-2xl border border-dashed border-brand-300 px-3 py-2 text-left text-sm text-brand-700 dark:text-brand-200"
            >
              <Sparkles size={15} /> Voorstel: <strong>{suggested.name}</strong>
              <span className="ml-auto text-xs font-semibold">Toepassen</span>
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            {sortedCategories.map((c) => {
              const active = form.category_id === c.id
              const color = categoryColor(c)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => set({ category_id: active ? '' : c.id })}
                  className={`chip border py-1.5 text-[13px] transition ${
                    active ? 'border-transparent text-white' : 'border-line bg-surface text-ink hover:bg-surface-2'
                  }`}
                  style={active ? { backgroundColor: color } : undefined}
                  aria-pressed={active}
                >
                  {!active && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
                  {c.name}
                </button>
              )
            })}
            {categories.length === 0 && (
              <p className="text-sm text-muted">Nog geen categorieën — maak er aan bij Instellingen.</p>
            )}
          </div>
        </div>

        <Field label={form.is_recurring ? 'Startdatum' : 'Datum'} error={errors.date}>
          <input
            type="date"
            className="input"
            value={form.occurred_on}
            onChange={(e) => set({ occurred_on: e.target.value })}
            required
          />
        </Field>

        <div className="rounded-3xl bg-surface-2/60 p-4">
          <Switch
            checked={form.is_shared}
            onChange={(is_shared) => set({ is_shared, paid_by: is_shared ? form.paid_by || user.id : user.id })}
            label="Gedeelde kost"
            description={partner ? `Zichtbaar voor jou en ${partner.display_name}, telt mee in de verrekening` : 'Zichtbaar voor jullie beiden'}
          />
          {form.is_shared && form.type === 'expense' && partner && (
            <div className="mt-3">
              <span className="label">Betaald door</span>
              <Segmented
                className="w-full"
                value={form.paid_by}
                onChange={(paid_by) => set({ paid_by })}
                options={[
                  { value: user.id, label: me?.display_name || 'Ik' },
                  { value: partner.user_id, label: partner.display_name },
                ]}
              />
            </div>
          )}
        </div>

        {tags.length > 0 && (
          <div>
            <span className="label">Tags</span>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = form.tag_ids.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      set({ tag_ids: active ? form.tag_ids.filter((id) => id !== tag.id) : [...form.tag_ids, tag.id] })
                    }
                    className={`chip border py-1.5 ${
                      active ? 'border-brand-500 bg-brand-500 text-white' : 'border-line text-muted hover:text-ink'
                    }`}
                  >
                    #{tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {!form.is_recurring && (
          <div>
            <span className="label">Bonnetje</span>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleReceipt} />
            {ocr ? (
              <div className="rounded-2xl border border-line p-3 text-sm">
                <p className="mb-2 text-muted">{ocr.stage}</p>
                <div className="h-1.5 overflow-hidden rounded-pill bg-surface-2">
                  <div className="h-full bg-brand-500 transition-all" style={{ width: `${Math.max(8, ocr.progress * 100)}%` }} />
                </div>
              </div>
            ) : form.receipt_path ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={viewReceipt}>
                  <ExternalLink size={15} /> Bekijk bonnetje
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
                  <Camera size={15} /> Vervangen
                </button>
                <button type="button" className="btn btn-ghost btn-sm text-expense" onClick={() => set({ receipt_path: '', receipt_text: '' })}>
                  Loskoppelen
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-secondary w-full" onClick={() => fileRef.current?.click()}>
                <Camera size={18} /> Bonnetje scannen
              </button>
            )}
            {form.receipt_text && !ocr && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted">Herkende tekst (doorzoekbaar)</summary>
                <textarea
                  className="input mt-2 text-xs"
                  rows={4}
                  value={form.receipt_text}
                  onChange={(e) => set({ receipt_text: e.target.value })}
                />
              </details>
            )}
          </div>
        )}

        {!editing && (
          <div className="rounded-3xl bg-surface-2/60 p-4">
            <Switch
              checked={form.is_recurring}
              onChange={(is_recurring) => set({ is_recurring })}
              label="Herhalen"
              description="Bv. huur, loon of abonnementen — wordt automatisch ingeboekt"
            />
            {form.is_recurring && (
              <div className="mt-3 space-y-3">
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
                <Field label="Einddatum (optioneel)" error={errors.end}>
                  <input
                    type="date"
                    className="input"
                    value={form.recurrence_end_date}
                    min={form.occurred_on}
                    onChange={(e) => set({ recurrence_end_date: e.target.value })}
                  />
                </Field>
                <p className="flex items-start gap-2 text-xs text-muted">
                  <Repeat size={14} className="mt-0.5 shrink-0" />
                  Elke boeking verschijnt eerst als &lsquo;te bevestigen&rsquo;, zodat je een afwijkend bedrag kan aanpassen.
                </p>
              </div>
            )}
          </div>
        )}
      </form>
    </Sheet>
  )
}
