import { useMemo, useState } from 'react'
import { BarChart3, CopyPlus, Flag, Minus, PiggyBank, Plus, Target, Trash2 } from 'lucide-react'
import {
  Card,
  CardHeader,
  CategoryIcon,
  EmptyState,
  Field,
  Money,
  MonthSwitcher,
  PageHeader,
  ProgressBar,
  Segmented,
  Sheet,
  Switch,
} from '../components/ui'
import { TrendChart } from '../components/charts'
import { useBudgets, useCategories, useGoals, useTransactions } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { budgetHealth, budgetHistory, budgetLines, goalPlan } from '../lib/finance'
import { formatDate, formatMonth, monthKey, monthStart, shiftMonth } from '../lib/dates'
import { formatMoney, formatPercent, parseAmount, sum } from '../lib/format'
import * as api from '../lib/api'

function BudgetSheet({ budget, month, categories, existing, onClose }) {
  const { showError, toast, removeWithUndo } = useToast()
  const editing = Boolean(budget?.id)
  const [form, setForm] = useState(() => ({
    category_id: budget?.category_id || '',
    amount: budget ? String(budget.amount).replace('.', ',') : '',
    is_shared: budget?.is_shared || false,
    rollover: budget?.rollover || false,
    actual_amount: budget?.actual_amount != null ? String(budget.actual_amount).replace('.', ',') : '',
  }))
  const [saving, setSaving] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const available = categories.filter(
    (c) => editing || !existing.some((b) => b.category_id === c.id && b.is_shared === form.is_shared),
  )

  async function submit(e) {
    e.preventDefault()
    const amount = parseAmount(form.amount)
    const actual = form.actual_amount.trim() === '' ? null : parseAmount(form.actual_amount)
    if (!form.category_id) return showError(null, 'Kies een categorie.')
    if (!(amount >= 0)) return showError(null, 'Vul een geldig budget in.')
    if (actual !== null && !(actual >= 0)) return showError(null, 'Ongeldig werkelijk bedrag.')
    setSaving(true)
    try {
      await api.saveBudget({ ...form, id: budget?.id, month: monthKey(month), amount, actual_amount: actual })
      toast(editing ? 'Budget bijgewerkt' : 'Budget toegevoegd')
      onClose()
    } catch (error) {
      showError(error, 'Opslaan mislukt.')
    } finally {
      setSaving(false)
    }
  }

  function remove() {
    onClose()
    removeWithUndo({ key: budget.id, message: 'Budget verwijderd', commit: () => api.deleteBudget(budget.id) })
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? 'Budget bewerken' : `Budget voor ${formatMonth(month)}`}
      footer={
        <div className="flex gap-2">
          {editing && (
            <button type="button" className="btn btn-danger px-4" onClick={remove} aria-label="Verwijderen">
              <Trash2 size={18} />
            </button>
          )}
          <button form="budget-form" className="btn btn-primary flex-1" disabled={saving}>
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      }
    >
      <form id="budget-form" onSubmit={submit} className="space-y-4">
        {!editing && (
          <Segmented
            className="w-full"
            value={form.is_shared}
            onChange={(is_shared) => set({ is_shared, category_id: '' })}
            options={[
              { value: false, label: 'Persoonlijk' },
              { value: true, label: 'Gedeeld' },
            ]}
          />
        )}
        <Field label="Categorie">
          <select
            className="input"
            value={form.category_id}
            disabled={editing}
            onChange={(e) => set({ category_id: e.target.value })}
            required
          >
            <option value="">Kies een categorie</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Budget per maand (€)">
          <input className="input money" inputMode="decimal" placeholder="0,00" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
        </Field>
        <Switch
          checked={form.rollover}
          onChange={(rollover) => set({ rollover })}
          label="Overschot meenemen"
          description="Wat je deze maand niet uitgeeft (of te veel uitgeeft), schuift door naar volgende maand."
        />
        <div className="rounded-3xl bg-surface-2/60 p-4">
          <Field
            label="Werkelijke uitgave (handmatig)"
            hint={
              budget
                ? `Laat leeg om automatisch te rekenen met je transacties (nu ${formatMoney(budget.tracked)}).`
                : 'Laat leeg om automatisch te rekenen met je transacties.'
            }
          >
            <input
              className="input money"
              inputMode="decimal"
              placeholder="automatisch"
              value={form.actual_amount}
              onChange={(e) => set({ actual_amount: e.target.value })}
            />
          </Field>
        </div>
      </form>
    </Sheet>
  )
}

function GoalSheet({ goal, onClose }) {
  const { showError, toast, removeWithUndo } = useToast()
  const editing = Boolean(goal?.id)
  const [form, setForm] = useState({
    name: goal?.name || '',
    target_amount: goal ? String(goal.target_amount).replace('.', ',') : '',
    current_amount: '',
    target_date: goal?.target_date || '',
    is_shared: goal?.is_shared || false,
  })
  const [saving, setSaving] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  async function submit(e) {
    e.preventDefault()
    const target = parseAmount(form.target_amount)
    const start = form.current_amount ? parseAmount(form.current_amount) : 0
    if (!form.name.trim()) return showError(null, 'Geef je spaardoel een naam.')
    if (!(target > 0)) return showError(null, 'Vul een geldig doelbedrag in.')
    setSaving(true)
    try {
      await api.saveGoal({ ...form, id: goal?.id, target_amount: target, current_amount: start || 0 })
      toast(editing ? 'Spaardoel bijgewerkt' : 'Spaardoel aangemaakt')
      onClose()
    } catch (error) {
      showError(error, 'Opslaan mislukt.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? 'Spaardoel bewerken' : 'Nieuw spaardoel'}
      footer={
        <div className="flex gap-2">
          {editing && (
            <button
              type="button"
              className="btn btn-danger px-4"
              aria-label="Verwijderen"
              onClick={() => {
                onClose()
                removeWithUndo({ key: goal.id, message: 'Spaardoel verwijderd', commit: () => api.deleteGoal(goal.id) })
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button form="goal-form" className="btn btn-primary flex-1" disabled={saving}>
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      }
    >
      <form id="goal-form" onSubmit={submit} className="space-y-4">
        <Field label="Naam">
          <input className="input" maxLength={80} placeholder="bv. Reis naar Japan" value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Doelbedrag (€)">
            <input className="input money" inputMode="decimal" value={form.target_amount} onChange={(e) => set({ target_amount: e.target.value })} />
          </Field>
          <Field label="Tegen (optioneel)">
            <input type="date" className="input" value={form.target_date} onChange={(e) => set({ target_date: e.target.value })} />
          </Field>
        </div>
        {!editing && (
          <Field label="Al gespaard (€)">
            <input className="input money" inputMode="decimal" placeholder="0,00" value={form.current_amount} onChange={(e) => set({ current_amount: e.target.value })} />
          </Field>
        )}
        {!editing && <Switch checked={form.is_shared} onChange={(is_shared) => set({ is_shared })} label="Samen sparen" description="Zichtbaar en aanpasbaar voor jullie beiden" />}
      </form>
    </Sheet>
  )
}

function DepositSheet({ goal, onClose }) {
  const { showError, toast } = useToast()
  const [mode, setMode] = useState('in')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!(value > 0)) return showError(null, 'Vul een bedrag in.')
    setSaving(true)
    try {
      await api.depositToGoal(goal, mode === 'in' ? value : -value)
      toast(mode === 'in' ? `${formatMoney(value)} gestort` : `${formatMoney(value)} opgenomen`)
      onClose()
    } catch (error) {
      showError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={goal.name}
      footer={
        <button form="deposit-form" className="btn btn-primary w-full" disabled={saving}>
          {mode === 'in' ? 'Storten' : 'Opnemen'}
        </button>
      }
    >
      <form id="deposit-form" onSubmit={submit} className="space-y-4">
        <Segmented
          className="w-full"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'in', label: 'Storten' },
            { value: 'out', label: 'Opnemen' },
          ]}
        />
        <input
          className="input money text-center text-3xl font-semibold"
          inputMode="decimal"
          placeholder="0,00"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Bedrag"
        />
        <p className="text-center text-sm text-muted">
          Nu gespaard: <Money amount={goal.current_amount} /> van <Money amount={goal.target_amount} />
        </p>
      </form>
    </Sheet>
  )
}

export default function Budgets() {
  const { user } = useAuth()
  const [month, setMonth] = useState(monthStart())
  const [budgetSheet, setBudgetSheet] = useState(null) // null | 'new' | line
  const [goalSheet, setGoalSheet] = useState(null)
  const [depositGoal, setDepositGoal] = useState(null)
  const { budgets } = useBudgets()
  const { transactions } = useTransactions()
  const { categories, byId } = useCategories()
  const { goals } = useGoals()
  const { toast, showError } = useToast()

  const lines = useMemo(() => budgetLines(budgets, transactions, month), [budgets, transactions, month])
  const history = useMemo(() => budgetHistory(budgets, transactions, 6, month), [budgets, transactions, month])
  const prevMonth = shiftMonth(month, -1)
  const prevRows = useMemo(
    () => budgets.filter((b) => b.month === monthKey(prevMonth) && (b.is_shared || b.user_id === user.id)),
    [budgets, prevMonth, user.id],
  )
  const missingFromPrev = prevRows.filter((p) => !lines.some((l) => l.category_id === p.category_id && l.is_shared === p.is_shared))

  const total = {
    available: sum(lines, (l) => l.available),
    spent: sum(lines, (l) => l.spent),
  }
  const totalRatio = total.available > 0 ? total.spent / total.available : 0

  async function copyPrevious() {
    try {
      const n = await api.copyBudgets(prevRows, monthKey(month), lines)
      toast(n ? `${n} budget(ten) overgenomen` : 'Alles stond al klaar')
    } catch (error) {
      showError(error, 'Overnemen mislukt.')
    }
  }

  const groups = [
    { title: 'Gedeeld', rows: lines.filter((l) => l.is_shared) },
    { title: 'Persoonlijk', rows: lines.filter((l) => !l.is_shared) },
  ].filter((g) => g.rows.length)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Budgetten & sparen"
        actions={<MonthSwitcher date={month} onChange={setMonth} />}
      />

      <Card className="p-5">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Uitgegeven van je budget</p>
            <p className="text-2xl font-semibold tracking-tight">
              <Money amount={total.spent} /> <span className="text-base font-medium text-muted">/ <Money amount={total.available} /></span>
            </p>
          </div>
          <span className={`chip ${totalRatio > 1 ? 'bg-expense/10 text-expense' : 'bg-income/10 text-income'}`}>
            {total.available ? formatPercent(totalRatio * 100) : '–'}
          </span>
        </div>
        <ProgressBar ratio={totalRatio} tone={budgetHealth(totalRatio)} />
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary btn-sm" onClick={() => setBudgetSheet('new')} disabled={!categories.length}>
            <Plus size={16} /> Budget toevoegen
          </button>
          {missingFromPrev.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={copyPrevious}>
              <CopyPlus size={16} /> {missingFromPrev.length} overnemen van {formatMonth(prevMonth)}
            </button>
          )}
        </div>
      </Card>

      {lines.length === 0 ? (
        <Card>
          <EmptyState
            icon={PiggyBank}
            title="Nog geen budgetten deze maand"
            text={categories.length ? 'Leg per categorie vast hoeveel je wil uitgeven.' : 'Maak eerst categorieën aan bij Instellingen.'}
          />
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.title}>
            <h2 className="mb-2 px-1 text-sm font-semibold text-muted">{group.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.rows.map((l) => {
                const category = byId.get(l.category_id)
                const health = budgetHealth(l.ratio)
                return (
                  <button key={l.id} onClick={() => setBudgetSheet(l)} className="card p-4 text-left transition hover:shadow-lg">
                    <div className="mb-3 flex items-center gap-3">
                      <CategoryIcon category={category} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{category?.name || 'Categorie'}</p>
                        <p className="flex flex-wrap gap-1 text-xs text-muted">
                          {l.rollover && <span>↻ meenemen</span>}
                          {l.manual && <span className="font-medium text-brand-500">· handmatig</span>}
                          {l.carried !== 0 && (
                            <span>
                              · <Money amount={l.carried} sign /> vorige maand
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <Money amount={l.spent} className="block font-semibold" />
                        <span className="text-xs text-muted">
                          van <Money amount={l.available} />
                        </span>
                      </div>
                    </div>
                    <ProgressBar ratio={l.ratio} tone={health} />
                    <p className={`mt-2 text-xs font-medium ${l.left < 0 ? 'text-expense' : 'text-muted'}`}>
                      {l.left >= 0 ? (
                        <>
                          Nog <Money amount={l.left} /> over
                        </>
                      ) : (
                        <>
                          <Money amount={-l.left} /> over budget
                        </>
                      )}
                    </p>
                  </button>
                )
              })}
            </div>
          </section>
        ))
      )}

      <Card className="p-5">
        <CardHeader title="Budget vs. werkelijkheid" subtitle="Laatste 6 maanden" icon={BarChart3} />
        <TrendChart
          data={history}
          series={[
            { key: 'budget', name: 'Budget', color: '#a595ff' },
            { key: 'spent', name: 'Uitgegeven', color: '#533afd' },
          ]}
        />
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Target size={19} className="text-muted" /> Spaardoelen
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={() => setGoalSheet('new')}>
            <Plus size={16} /> Nieuw
          </button>
        </div>
        {goals.length === 0 ? (
          <Card>
            <EmptyState icon={Flag} title="Nog geen spaardoelen" text="Spaar samen of alleen voor een reis, buffer of grote aankoop." />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {goals.map((g) => {
              const plan = goalPlan(g)
              const done = plan.remaining === 0
              return (
                <Card key={g.id} className="p-4">
                  <button className="w-full text-left" onClick={() => setGoalSheet(g)}>
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="font-semibold">{g.name}</p>
                      {g.is_shared && <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">Samen</span>}
                    </div>
                    <p className="mb-3 text-sm text-muted">
                      <Money amount={g.current_amount} className="font-semibold text-ink" /> van <Money amount={g.target_amount} />
                    </p>
                    <ProgressBar ratio={plan.progress} tone={done ? 'ok' : 'brand'} />
                    <p className="mt-2 text-xs text-muted">
                      {done
                        ? '🎉 Doel bereikt!'
                        : plan.perMonth
                          ? `Nog ${formatMoney(plan.perMonth)} per maand tot ${formatDate(g.target_date, { month: 'long', year: 'numeric' })}`
                          : `Nog ${formatMoney(plan.remaining)} te gaan`}
                    </p>
                  </button>
                  <div className="mt-3 flex gap-2">
                    <button className="btn btn-secondary btn-sm flex-1" onClick={() => setDepositGoal(g)}>
                      <Plus size={15} /> <Minus size={15} /> Storten / opnemen
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {budgetSheet && (
        <BudgetSheet
          budget={budgetSheet === 'new' ? null : budgetSheet}
          month={month}
          categories={categories}
          existing={lines}
          onClose={() => setBudgetSheet(null)}
        />
      )}
      {goalSheet && <GoalSheet goal={goalSheet === 'new' ? null : goalSheet} onClose={() => setGoalSheet(null)} />}
      {depositGoal && <DepositSheet goal={depositGoal} onClose={() => setDepositGoal(null)} />}
    </div>
  )
}
