import { useState } from 'react'
import { Check, Plus, Shapes, Tag, Trash2, Zap } from 'lucide-react'
import { Card, CardHeader, CategoryIcon, Field, Money, Segmented, Sheet, Switch } from '../ui'
import { useCategories, useTags, useTemplates } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { CATEGORY_COLORS, categoryColor } from '../../lib/categories'
import { parseAmount } from '../../lib/format'
import * as api from '../../lib/api'

function CategorySheet({ category, onClose }) {
  const { user } = useAuth()
  const { toast, showError, removeWithUndo } = useToast()
  const editing = Boolean(category?.id)
  const [form, setForm] = useState({
    name: category?.name || '',
    color: category ? categoryColor(category) : CATEGORY_COLORS[0],
    tax_deductible: category?.tax_deductible || false,
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) return showError(null, 'Geef een naam.')
    try {
      await api.saveCategory({ ...form, id: category?.id })
      toast(editing ? 'Categorie bijgewerkt' : 'Categorie toegevoegd')
      onClose()
    } catch (error) {
      showError(error)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? 'Categorie bewerken' : 'Nieuwe categorie'}
      footer={
        <div className="flex gap-2">
          {editing && category.user_id === user.id && (
            <button
              type="button"
              className="btn btn-danger px-4"
              aria-label="Verwijderen"
              onClick={() => {
                onClose()
                removeWithUndo({
                  key: category.id,
                  message: `"${category.name}" verwijderd`,
                  commit: () => api.deleteCategory(category.id),
                })
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button form="cat-form" className="btn btn-primary flex-1">
            Opslaan
          </button>
        </div>
      }
    >
      <form id="cat-form" onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3">
          <CategoryIcon category={{ ...form, id: category?.id }} size={48} />
          <Field label="Naam" className="flex-1">
            <input className="input" maxLength={60} autoFocus={!editing} value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
        </div>
        <div>
          <span className="label">Kleur</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set({ color: c })}
                className="flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition"
                style={{ backgroundColor: c, boxShadow: form.color === c ? `0 0 0 2px ${c}` : undefined }}
                aria-label={`Kleur ${c}`}
                aria-pressed={form.color === c}
              >
                {form.color === c && <Check size={16} className="text-white" />}
              </button>
            ))}
          </div>
        </div>
        <Switch
          checked={form.tax_deductible}
          onChange={(tax_deductible) => set({ tax_deductible })}
          label="Fiscaal aftrekbaar"
          description="Komt in het fiscaal jaaroverzicht (bv. kinderopvang, giften, dienstencheques)."
        />
        {editing && category.user_id !== user.id && (
          <p className="text-xs text-muted">Enkel wie de categorie aanmaakte, kan ze verwijderen.</p>
        )}
      </form>
    </Sheet>
  )
}

function TemplateSheet({ template, onClose }) {
  const { categories } = useCategories()
  const { toast, showError, removeWithUndo } = useToast()
  const editing = Boolean(template?.id)
  const [form, setForm] = useState({
    name: template?.name || '',
    type: template?.type || 'expense',
    amount: template ? String(template.amount).replace('.', ',') : '',
    category_id: template?.category_id || '',
    is_shared: template?.is_shared || false,
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  async function submit(e) {
    e.preventDefault()
    const amount = parseAmount(form.amount)
    if (!form.name.trim() || !(amount > 0)) return showError(null, 'Vul een naam en een geldig bedrag in.')
    try {
      await api.saveTemplate({ ...form, amount, id: template?.id })
      toast('Sjabloon opgeslagen')
      onClose()
    } catch (error) {
      showError(error)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? 'Sjabloon bewerken' : 'Nieuw sjabloon'}
      footer={
        <div className="flex gap-2">
          {editing && (
            <button
              type="button"
              className="btn btn-danger px-4"
              aria-label="Verwijderen"
              onClick={() => {
                onClose()
                removeWithUndo({ key: template.id, message: 'Sjabloon verwijderd', commit: () => api.deleteTemplate(template.id) })
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button form="tpl-form" className="btn btn-primary flex-1">
            Opslaan
          </button>
        </div>
      }
    >
      <form id="tpl-form" onSubmit={submit} className="space-y-4">
        <Segmented
          className="w-full"
          value={form.type}
          onChange={(type) => set({ type })}
          options={[
            { value: 'expense', label: 'Uitgave' },
            { value: 'income', label: 'Inkomst' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Naam">
            <input className="input" maxLength={80} placeholder="bv. Huur" value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Bedrag (€)">
            <input className="input money" inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
          </Field>
        </div>
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
        <Switch
          checked={form.is_shared}
          onChange={(is_shared) => set({ is_shared })}
          label="Gedeeld sjabloon"
          description="Zichtbaar voor jullie beiden; anders enkel voor jou."
        />
      </form>
    </Sheet>
  )
}

function TagSheet({ tag, onClose }) {
  const { user } = useAuth()
  const { toast, showError, removeWithUndo } = useToast()
  const [name, setName] = useState(tag?.name || '')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await api.saveTag({ id: tag?.id, name })
      toast('Tag opgeslagen')
      onClose()
    } catch (error) {
      showError(error)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={tag ? 'Tag bewerken' : 'Nieuwe tag'}
      footer={
        <div className="flex gap-2">
          {tag && tag.user_id === user.id && (
            <button
              type="button"
              className="btn btn-danger px-4"
              aria-label="Verwijderen"
              onClick={() => {
                onClose()
                removeWithUndo({ key: tag.id, message: `#${tag.name} verwijderd`, commit: () => api.deleteTag(tag.id) })
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button form="tag-form" className="btn btn-primary flex-1">
            Opslaan
          </button>
        </div>
      }
    >
      <form id="tag-form" onSubmit={submit}>
        <Field label="Naam" hint="Bv. vakantie-2026, verbouwing, cadeau">
          <input className="input" maxLength={40} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </form>
    </Sheet>
  )
}

export default function ListSettings() {
  const { categories } = useCategories()
  const { tags } = useTags()
  const { templates } = useTemplates()
  const [sheet, setSheet] = useState(null) // { kind, item }

  return (
    <>
      <Card className="p-5">
        <CardHeader
          title="Categorieën"
          subtitle="Gedeeld door jullie beiden"
          icon={Shapes}
          action={
            <button className="btn btn-secondary btn-sm" onClick={() => setSheet({ kind: 'category' })}>
              <Plus size={15} /> Nieuw
            </button>
          }
        />
        {categories.length === 0 ? (
          <p className="text-sm text-muted">Nog geen categorieën. Begin bv. met Wonen, Boodschappen, Vervoer, Vrije tijd en Loon.</p>
        ) : (
          <ul className="-mx-2 grid gap-1 sm:grid-cols-2">
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-surface-2"
                  onClick={() => setSheet({ kind: 'category', item: c })}
                >
                  <CategoryIcon category={c} size={34} />
                  <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                  {c.tax_deductible && <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">fiscaal</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <CardHeader
          title="Sjablonen"
          subtitle="Snel invullen van vaste bedragen"
          icon={Zap}
          action={
            <button className="btn btn-secondary btn-sm" onClick={() => setSheet({ kind: 'template' })}>
              <Plus size={15} /> Nieuw
            </button>
          }
        />
        {templates.length === 0 ? (
          <p className="text-sm text-muted">Bv. loon, huur of je wekelijkse boodschappen — verschijnen bovenaan bij een nieuwe transactie.</p>
        ) : (
          <ul className="-mx-2">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  className="flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-surface-2"
                  onClick={() => setSheet({ kind: 'template', item: t })}
                >
                  <span className="truncate text-sm font-medium">
                    {t.name}
                    {t.is_shared && <span className="ml-2 text-xs text-muted">gedeeld</span>}
                  </span>
                  <Money amount={t.type === 'income' ? t.amount : -t.amount} sign className={`text-sm font-semibold ${t.type === 'income' ? 'text-income' : ''}`} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <CardHeader
          title="Tags"
          subtitle="Groepeer over categorieën heen"
          icon={Tag}
          action={
            <button className="btn btn-secondary btn-sm" onClick={() => setSheet({ kind: 'tag' })}>
              <Plus size={15} /> Nieuw
            </button>
          }
        />
        {tags.length === 0 ? (
          <p className="text-sm text-muted">Bv. #vakantie of #verbouwing om kosten van een project samen te zien.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button key={t.id} className="chip border border-line py-1.5 hover:bg-surface-2" onClick={() => setSheet({ kind: 'tag', item: t })}>
                #{t.name}
              </button>
            ))}
          </div>
        )}
      </Card>

      {sheet?.kind === 'category' && <CategorySheet category={sheet.item} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'template' && <TemplateSheet template={sheet.item} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'tag' && <TagSheet tag={sheet.item} onClose={() => setSheet(null)} />}
    </>
  )
}
