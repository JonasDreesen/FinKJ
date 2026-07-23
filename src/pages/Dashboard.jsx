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
import { useCategories } from '../hooks/useCategories'
import { useDashboardData } from '../hooks/useDashboardData'
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

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d']

function formatAmount(amount) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

export default function Dashboard() {
  const [periodType, setPeriodType] = useState('month')
  const [monthDate, setMonthDate] = useState(monthStart())
  const [yearDate, setYearDate] = useState(yearStart())
  const [scopeFilter, setScopeFilter] = useState('all')
  const [categoryId, setCategoryId] = useState('')

  const { categories } = useCategories()

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
      <h1 className="mb-4 text-2xl font-semibold">Dashboard</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2 text-sm">
          {[
            { key: 'month', label: 'Maand' },
            { key: 'year', label: 'Jaar' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPeriodType(opt.key)}
              className={`rounded-md px-3 py-1 ${
                periodType === opt.key ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600'
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
        <p className="text-sm text-gray-500">Laden...</p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">Inkomsten</div>
              <div className="text-xl font-semibold text-green-600">{formatAmount(totalIncome)}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">Uitgaven</div>
              <div className="text-xl font-semibold text-red-600">{formatAmount(totalExpense)}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">Saldo</div>
              <div className={`text-xl font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(balance)}
              </div>
            </div>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 font-semibold">Uitgaven per categorie</h2>
              {byCategory.length === 0 ? (
                <p className="text-sm text-gray-500">Geen uitgaven in deze periode.</p>
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

            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
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
