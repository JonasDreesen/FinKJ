import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, Printer, Clock } from 'lucide-react'
import { useCategories } from '../hooks/useCategories'
import { useDashboardData } from '../hooks/useDashboardData'
import { useUpcomingRecurring } from '../hooks/useUpcomingRecurring'
import { useSharedBalance } from '../hooks/useSharedBalance'
import { useAuth } from '../context/AuthContext'
import {
  formatMonthLabel,
  formatYearLabel,
  monthRange,
  monthStart,
  shiftMonth,
  shiftYear,
  yearRange,
  yearStart,
} from '../lib/month'

const COLORS = ['#533afd', '#16a34a', '#d97706', '#dc2626', '#8066ff', '#0891b2', '#db2777', '#65a30d']

function formatAmount(amount) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

export default function Dashboard() {
  const [periodType, setPeriodType] = useState('month')
  const [monthDate, setMonthDate] = useState(monthStart())
  const [yearDate, setYearDate] = useState(yearStart())
  const [scopeFilter, setScopeFilter] = useState('all')
  const [categoryId, setCategoryId] = useState('')

  const { session } = useAuth()
  const { categories } = useCategories()
  const { upcoming } = useUpcomingRecurring()
  const { balance: sharedBalance } = useSharedBalance(session?.user?.id)

  const range = useMemo(() => {
    if (periodType === 'month') {
      return { ...monthRange(monthDate), referenceDate: monthDate }
    }
    return { ...yearRange(yearDate), referenceDate: yearDate }
  }, [periodType, monthDate, yearDate])

  const { loading, totalIncome, totalExpense, balance, byCategory, trendData } = useDashboardData({
    range,
    scopeFilter,
    categoryId: categoryId || null,
  })

  function goPrev() {
    if (periodType === 'month') setMonthDate((d) => shiftMonth(d, -1))
    else setYearDate((d) => shiftYear(d, -1))
  }

  function goNext() {
    if (periodType === 'month') setMonthDate((d) => shiftMonth(d, 1))
    else setYearDate((d) => shiftYear(d, 1))
  }

  const periodLabel = periodType === 'month' ? formatMonthLabel(monthDate) : formatYearLabel(yearDate)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="page-title">Dashboard</h1>
        <button
          onClick={() => window.print()}
          className="no-print flex items-center gap-1.5 rounded-pill border border-gray-300 px-3 py-1.5 text-sm shadow-sm dark:border-gray-600"
        >
          <Printer size={15} />
          Afdrukken / PDF
        </button>
      </div>
      <p className="mb-4 hidden print:block text-lg font-semibold capitalize">
        Overzicht {periodLabel}
      </p>

      {upcoming.length > 0 && (
        <div className="no-print mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <h2 className="mb-2 flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-200">
            <Clock size={16} />
            Binnenkort verschuldigd
          </h2>
          <ul className="space-y-1 text-sm text-amber-900 dark:text-amber-100">
            {upcoming.map((u) => (
              <li key={u.id} className="flex items-center justify-between">
                <span>
                  {u.description || u.category?.name || '(geen omschrijving)'}
                  {u.is_shared && ' · gedeeld'}
                </span>
                <span>
                  {formatAmount(u.amount)} — {u.next_due_date}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2 text-sm">
          {[
            { key: 'month', label: 'Maand' },
            { key: 'year', label: 'Jaar' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPeriodType(opt.key)}
              className={`rounded-pill px-3 py-1 ${
                periodType === opt.key ? 'bg-brand-500 text-white' : 'border border-gray-300 dark:border-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600">
            ←
          </button>
          <span className="text-sm font-medium capitalize">{periodLabel}</span>
          <button onClick={goNext} className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600">
            →
          </button>
        </div>

        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
        >
          <option value="all">Alles</option>
          <option value="personal">Persoonlijk</option>
          <option value="shared">Gedeeld</option>
        </select>

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
        >
          <option value="">Alle categorieën</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Laden...</p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400">
                  <TrendingUp size={16} />
                </span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Inkomsten</span>
              </div>
              <div className="text-2xl font-semibold text-green-600 money">{formatAmount(totalIncome)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                  <TrendingDown size={16} />
                </span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Uitgaven</span>
              </div>
              <div className="text-2xl font-semibold text-red-600 money">{formatAmount(totalExpense)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    balance >= 0
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                  }`}
                >
                  <Wallet size={16} />
                </span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Saldo</span>
              </div>
              <div className={`money text-2xl font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(balance)}
              </div>
            </div>
          </div>

          {Math.abs(sharedBalance) >= 0.01 && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
              <span className="font-semibold">Gedeelde balans: </span>
              {sharedBalance > 0
                ? `je partner is jou ${formatAmount(sharedBalance)} verschuldigd (jij hebt meer voorgeschoten aan gedeelde uitgaven).`
                : `jij bent je partner ${formatAmount(Math.abs(sharedBalance))} verschuldigd (je partner heeft meer voorgeschoten aan gedeelde uitgaven).`}
            </div>
          )}

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 font-semibold">Uitgaven per categorie</h2>
              {byCategory.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Geen uitgaven in deze periode.</p>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={90} label>
                        {byCategory.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatAmount(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 font-semibold">Trend (laatste 12 maanden)</h2>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value) => formatAmount(value)} />
                    <Legend />
                    <Bar dataKey="inkomsten" fill="#16a34a" />
                    <Bar dataKey="uitgaven" fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
