import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  HandCoins,
  PieChart as PieIcon,
  PiggyBank,
  Plus,
  Printer,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { Card, CardHeader, EmptyState, Money, MonthSwitcher, ProgressBar, Segmented, Skeleton } from '../components/ui'
import { DonutChart, TrendChart } from '../components/charts'
import TransactionRow from '../components/TransactionRow'
import {
  useBudgets,
  useCategories,
  useMembers,
  useRecurring,
  useSharedBalance,
  useTransactions,
} from '../hooks/useData'
import { useTransactionSheet } from '../context/SheetContext'
import { useToast } from '../context/ToastContext'
import { addDays, formatDate, formatMonth, isSameMonth, monthRange, monthStart, shiftMonth, todayISO } from '../lib/dates'
import { budgetHealth, budgetLines, expensesByCategory, inRange, matchesScope, monthlyTrend, totals } from '../lib/finance'
import { formatPercent } from '../lib/format'
import { categoryColor } from '../lib/categories'
import * as api from '../lib/api'

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Goeienacht'
  if (h < 12) return 'Goeiemorgen'
  if (h < 18) return 'Goeiemiddag'
  return 'Goeienavond'
}

export default function Overview() {
  const [month, setMonth] = useState(monthStart())
  const [scope, setScope] = useState('all')
  const { transactions, loading } = useTransactions()
  const { byId } = useCategories()
  const { budgets } = useBudgets()
  const { recurring } = useRecurring()
  const { balance } = useSharedBalance()
  const { me, partner, nameOf } = useMembers()
  const { openNew, openEdit } = useTransactionSheet()
  const { toast, showError } = useToast()

  const scoped = useMemo(() => transactions.filter((t) => matchesScope(t, scope)), [transactions, scope])
  const range = monthRange(month)
  const current = useMemo(() => scoped.filter((t) => inRange(t, range)), [scoped, range.start]) // eslint-disable-line react-hooks/exhaustive-deps
  const previous = useMemo(() => scoped.filter((t) => inRange(t, monthRange(shiftMonth(month, -1)))), [scoped, month])

  const now = totals(current)
  const before = totals(previous)
  const expenseDelta = before.expense > 0 ? (now.expense - before.expense) / before.expense : null

  const categories = useMemo(() => expensesByCategory(current, byId), [current, byId])
  const trend = useMemo(() => monthlyTrend(scoped, 6, month), [scoped, month])
  const lines = useMemo(
    () => budgetLines(budgets, transactions, month).sort((a, b) => b.ratio - a.ratio),
    [budgets, transactions, month],
  )
  const pending = useMemo(() => transactions.filter((t) => t.pending_review), [transactions])
  const upcoming = useMemo(() => {
    const until = addDays(todayISO(), 14)
    return recurring.filter((r) => r.next_due_date && r.next_due_date <= until).slice(0, 5)
  }, [recurring])
  const recent = current.slice(0, 6)

  async function confirmAll() {
    try {
      await api.confirmTransactions(pending.map((t) => t.id))
      toast(`${pending.length} boeking(en) bevestigd`)
    } catch (error) {
      showError(error)
    }
  }

  const monthName = isSameMonth(month, new Date()) ? 'deze maand' : formatMonth(month)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{greeting()}{me ? `, ${me.display_name}` : ''}</p>
          <h1 className="text-[26px] font-semibold tracking-tight sm:text-3xl">Overzicht</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSwitcher date={month} onChange={setMonth} />
          <button className="icon-btn no-print hidden sm:inline-flex" onClick={() => window.print()} title="Afdrukken / PDF">
            <Printer size={19} />
          </button>
        </div>
      </header>

      <Segmented
        size="sm"
        className="no-print"
        value={scope}
        onChange={setScope}
        options={[
          { value: 'all', label: 'Alles' },
          { value: 'personal', label: 'Persoonlijk' },
          { value: 'shared', label: 'Gedeeld' },
        ]}
      />

      <section className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-6 text-white shadow-lift">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-10 h-40 w-40 rounded-full bg-white/5" />
        <p className="text-sm text-white/75">Saldo {monthName}</p>
        {loading && !transactions.length ? (
          <Skeleton className="mt-2 h-11 w-48 bg-white/20" />
        ) : (
          <Money amount={now.net} sign className="mt-1 block text-[40px] font-semibold leading-none tracking-tight" />
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
            <p className="flex items-center gap-1 text-xs text-white/75">
              <ArrowDownRight size={14} /> Inkomsten
            </p>
            <Money amount={now.income} className="mt-0.5 block text-lg font-semibold" />
          </div>
          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
            <p className="flex items-center gap-1 text-xs text-white/75">
              <ArrowUpRight size={14} /> Uitgaven
            </p>
            <Money amount={now.expense} className="mt-0.5 block text-lg font-semibold" />
            {expenseDelta !== null && (
              <p className="mt-0.5 text-[11px] text-white/70">
                {expenseDelta > 0 ? '▲' : '▼'} {formatPercent(Math.abs(expenseDelta) * 100)} t.o.v. vorige maand
              </p>
            )}
          </div>
        </div>
      </section>

      {pending.length > 0 && (
        <Card className="no-print border-amber-200 bg-amber-50/80 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/20">
              <CalendarClock size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{pending.length} automatische boeking(en) te bevestigen</p>
              <p className="text-sm text-muted">Controleer of het bedrag klopt — tik om aan te passen.</p>
              <ul className="mt-2">
                {pending.slice(0, 3).map((t) => (
                  <TransactionRow key={t.id} t={t} category={byId.get(t.category_id)} nameOf={nameOf} onClick={() => openEdit(t)} showDate />
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn btn-sm bg-amber-500 text-white hover:bg-amber-600" onClick={confirmAll}>
                  <CheckCheck size={15} /> Alles bevestigen
                </button>
                {pending.length > 3 && (
                  <Link to="/transacties?filter=pending" className="btn btn-sm btn-ghost">
                    Alle {pending.length} bekijken
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <CardHeader
            title="Budgetten"
            icon={PiggyBank}
            action={
              <Link to="/budgetten" className="flex items-center text-sm font-medium text-brand-500">
                Alles <ChevronRight size={16} />
              </Link>
            }
          />
          {lines.length === 0 ? (
            <EmptyState
              title="Nog geen budget voor deze maand"
              text="Stel per categorie in hoeveel je wil uitgeven."
              action={
                <Link to="/budgetten" className="btn btn-secondary btn-sm">
                  Budget instellen
                </Link>
              }
            />
          ) : (
            <ul className="space-y-4">
              {lines.slice(0, 4).map((l) => {
                const health = budgetHealth(l.ratio)
                return (
                  <li key={l.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-1.5 font-medium">
                        {health === 'over' && <AlertTriangle size={14} className="shrink-0 text-expense" />}
                        <span className="truncate">{byId.get(l.category_id)?.name || 'Categorie'}</span>
                      </span>
                      <span className="shrink-0 text-muted">
                        <Money amount={l.spent} /> / <Money amount={l.available} />
                      </span>
                    </div>
                    <ProgressBar ratio={l.ratio} tone={health} />
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {partner && (
          <Card className="p-5">
            <CardHeader
              title={`Samen met ${partner.display_name}`}
              icon={HandCoins}
              action={
                <Link to="/samen" className="flex items-center text-sm font-medium text-brand-500">
                  Details <ChevronRight size={16} />
                </Link>
              }
            />
            <div className="flex items-center gap-4">
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                  Math.abs(balance) < 0.01
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15'
                    : 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300'
                }`}
              >
                <HandCoins size={26} />
              </span>
              <div>
                {Math.abs(balance) < 0.01 ? (
                  <>
                    <p className="text-lg font-semibold">Jullie staan quitte</p>
                    <p className="text-sm text-muted">Alle gedeelde kosten zijn verrekend.</p>
                  </>
                ) : balance > 0 ? (
                  <>
                    <p className="text-sm text-muted">{partner.display_name} is jou verschuldigd</p>
                    <Money amount={balance} className="text-2xl font-semibold text-income" />
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted">Jij bent {partner.display_name} verschuldigd</p>
                    <Money amount={-balance} className="text-2xl font-semibold text-expense" />
                  </>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-5 lg:col-span-2">
          <CardHeader title={`Uitgaven per categorie`} subtitle={monthName} icon={PieIcon} />
          {categories.length === 0 ? (
            <EmptyState icon={Receipt} title="Nog geen uitgaven" text={`Er zijn nog geen uitgaven voor ${monthName}.`} />
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className="relative">
                <DonutChart data={categories.map((c) => ({ ...c, name: c.category?.name || 'Zonder categorie' }))} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted">Totaal</span>
                  <Money amount={now.expense} className="text-lg font-semibold" />
                </div>
              </div>
              <ul className="w-full flex-1 space-y-2.5">
                {categories.slice(0, 7).map((c) => (
                  <li key={c.id} className="flex items-center gap-3 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(c.category) }} />
                    <span className="min-w-0 flex-1 truncate">{c.category?.name || 'Zonder categorie'}</span>
                    <span className="w-12 text-right text-xs text-muted">{formatPercent(c.share * 100)}</span>
                    <Money amount={c.value} className="w-24 text-right font-medium" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <CardHeader title="Laatste 6 maanden" icon={TrendingUp} />
          <TrendChart
            data={trend}
            series={[
              { key: 'income', name: 'Inkomsten', color: '#10b981' },
              { key: 'expense', name: 'Uitgaven', color: '#f43f5e' },
            ]}
          />
        </Card>

        {upcoming.length > 0 && (
          <Card className="p-5">
            <CardHeader title="Binnenkort" subtitle="Vaste lasten in de komende 2 weken" icon={CalendarClock} />
            <ul className="divide-y divide-line/60">
              {upcoming.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.description || byId.get(r.category_id)?.name || 'Vaste last'}</span>
                    <span className="text-xs text-muted">{formatDate(r.next_due_date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  </span>
                  <Money amount={r.type === 'income' ? r.amount : -r.amount} sign className={`font-semibold ${r.type === 'income' ? 'text-income' : ''}`} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className={`p-5 ${upcoming.length ? '' : 'lg:col-span-2'}`}>
          <CardHeader
            title="Recent"
            icon={Receipt}
            action={
              <Link to="/transacties" className="flex items-center text-sm font-medium text-brand-500">
                Alles <ChevronRight size={16} />
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              title="Nog niets ingegeven"
              text="Voeg je eerste uitgave of inkomst toe."
              action={
                <button className="btn btn-primary btn-sm" onClick={() => openNew()}>
                  <Plus size={16} /> Toevoegen
                </button>
              }
            />
          ) : (
            <ul className="-mx-2">
              {recent.map((t) => (
                <TransactionRow key={t.id} t={t} category={byId.get(t.category_id)} nameOf={nameOf} onClick={() => openEdit(t)} showDate />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
