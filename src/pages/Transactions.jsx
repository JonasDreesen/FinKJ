import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarClock, Plus, Repeat, Search, SearchX, X } from 'lucide-react'
import { Card, EmptyState, Money, MonthSwitcher, PageHeader, Segmented, Skeleton } from '../components/ui'
import TransactionRow from '../components/TransactionRow'
import RecurringSheet from '../components/RecurringSheet'
import { useCategories, useMembers, useRecurring, useTags, useTransactions } from '../hooks/useData'
import { useTransactionSheet } from '../context/SheetContext'
import { INTERVAL_LABELS, formatDate, formatDayHeading, monthRange, monthStart } from '../lib/dates'
import { inRange, matchesScope, totals } from '../lib/finance'
import { categoryColor } from '../lib/categories'

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export default function Transactions() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState('list')
  const [month, setMonth] = useState(monthStart())
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [scope, setScope] = useState('all')
  const [categoryId, setCategoryId] = useState('')
  const [tagId, setTagId] = useState('')
  const [editingRecurring, setEditingRecurring] = useState(null)
  const pendingOnly = params.get('filter') === 'pending'

  const { transactions, loading } = useTransactions()
  const { recurring } = useRecurring()
  const { categories, byId } = useCategories()
  const { tags, byId: tagsById } = useTags()
  const { nameOf } = useMembers()
  const { openNew, openEdit } = useTransactionSheet()

  useEffect(() => {
    if (params.get('nieuw')) {
      openNew()
      params.delete('nieuw')
      setParams(params, { replace: true })
    }
  }, [params, setParams, openNew])

  const searching = query.trim().length > 0
  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    const range = monthRange(month)
    return transactions.filter((t) => {
      if (pendingOnly) return t.pending_review
      if (!searching && !inRange(t, range)) return false
      if (type !== 'all' && t.type !== type) return false
      if (!matchesScope(t, scope)) return false
      if (categoryId && (t.category_id || 'none') !== categoryId) return false
      if (tagId && !(t.transaction_tags || []).some((tt) => tt.tag_id === tagId)) return false
      if (q) {
        const haystack = normalize(
          [
            t.description,
            t.receipt_text,
            byId.get(t.category_id)?.name,
            String(t.amount).replace('.', ','),
            ...(t.transaction_tags || []).map((tt) => tagsById.get(tt.tag_id)?.name),
          ].join(' '),
        )
        if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false
      }
      return true
    })
  }, [transactions, query, searching, month, type, scope, categoryId, tagId, pendingOnly, byId, tagsById])

  const groups = useMemo(() => {
    const map = new Map()
    for (const t of filtered) {
      if (!map.has(t.occurred_on)) map.set(t.occurred_on, [])
      map.get(t.occurred_on).push(t)
    }
    return [...map.entries()]
  }, [filtered])

  const sums = totals(filtered)
  const hasFilters = type !== 'all' || scope !== 'all' || categoryId || tagId

  return (
    <div>
      <PageHeader
        title="Transacties"
        actions={
          <button className="btn btn-primary hidden sm:inline-flex" onClick={() => openNew()}>
            <Plus size={18} /> Nieuw
          </button>
        }
      />

      <Segmented
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'list', label: 'Overzicht' },
          { value: 'recurring', label: `Vaste lasten (${recurring.length})` },
        ]}
      />

      {tab === 'recurring' ? (
        <Card className="p-2 sm:p-3">
          {recurring.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="Geen vaste lasten"
              text="Zet 'Herhalen' aan bij een nieuwe transactie voor huur, loon of abonnementen."
              action={
                <button className="btn btn-primary btn-sm" onClick={() => openNew({ is_recurring: true })}>
                  <Plus size={16} /> Vaste last toevoegen
                </button>
              }
            />
          ) : (
            <ul className="divide-y divide-line/60">
              {recurring.map((r) => {
                const cat = byId.get(r.category_id)
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => setEditingRecurring(r)}
                      className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left hover:bg-surface-2"
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${categoryColor(cat)}1f`, color: categoryColor(cat) }}
                      >
                        <Repeat size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.description || cat?.name || 'Vaste last'}</span>
                        <span className="block truncate text-xs text-muted">
                          {INTERVAL_LABELS[r.recurrence_interval]}
                          {r.is_shared && ' · gedeeld'}
                          {r.next_due_date
                            ? ` · volgende ${formatDate(r.next_due_date, { day: 'numeric', month: 'short' })}`
                            : ' · afgelopen'}
                        </span>
                      </span>
                      <Money
                        amount={r.type === 'income' ? r.amount : -r.amount}
                        sign
                        className={`font-semibold ${r.type === 'income' ? 'text-income' : ''}`}
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      ) : (
        <>
          <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 mb-4 space-y-3 bg-bg/90 px-4 pb-3 pt-1 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-0">
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                className="input pl-10 pr-10"
                placeholder="Zoek op omschrijving, bonnetje, bedrag of tag"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="icon-btn absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setQuery('')} aria-label="Wissen">
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {pendingOnly ? (
                <button className="chip shrink-0 bg-amber-100 py-1.5 text-amber-700" onClick={() => setParams({})}>
                  <CalendarClock size={14} /> Enkel te bevestigen <X size={14} />
                </button>
              ) : (
                !searching && <MonthSwitcher date={month} onChange={setMonth} />
              )}
              <select className="input min-h-[40px] w-auto shrink-0 py-0 text-sm" value={type} onChange={(e) => setType(e.target.value)} aria-label="Soort">
                <option value="all">In &amp; uit</option>
                <option value="expense">Uitgaven</option>
                <option value="income">Inkomsten</option>
              </select>
              <select className="input min-h-[40px] w-auto shrink-0 py-0 text-sm" value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Scope">
                <option value="all">Iedereen</option>
                <option value="personal">Persoonlijk</option>
                <option value="shared">Gedeeld</option>
              </select>
              <select className="input min-h-[40px] w-auto shrink-0 py-0 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Categorie">
                <option value="">Alle categorieën</option>
                <option value="none">Zonder categorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {tags.length > 0 && (
                <select className="input min-h-[40px] w-auto shrink-0 py-0 text-sm" value={tagId} onChange={(e) => setTagId(e.target.value)} aria-label="Tag">
                  <option value="">Alle tags</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.name}
                    </option>
                  ))}
                </select>
              )}
              {hasFilters && (
                <button
                  className="btn btn-ghost btn-sm shrink-0"
                  onClick={() => {
                    setType('all')
                    setScope('all')
                    setCategoryId('')
                    setTagId('')
                  }}
                >
                  Wissen
                </button>
              )}
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div className="card p-3">
              <p className="text-[11px] text-muted">In</p>
              <Money amount={sums.income} className="text-sm font-semibold text-income" />
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-muted">Uit</p>
              <Money amount={sums.expense} className="text-sm font-semibold" />
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-muted">Netto</p>
              <Money amount={sums.net} sign className="text-sm font-semibold" tone="auto" />
            </div>
          </div>

          {loading && !transactions.length ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <Card>
              {searching || hasFilters || pendingOnly ? (
                <EmptyState icon={SearchX} title="Niets gevonden" text="Probeer een andere zoekterm of filter." />
              ) : (
                <EmptyState
                  title="Nog geen transacties deze maand"
                  text="Tik op + om een uitgave of inkomst toe te voegen."
                  action={
                    <button className="btn btn-primary btn-sm" onClick={() => openNew()}>
                      <Plus size={16} /> Toevoegen
                    </button>
                  }
                />
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              {groups.map(([day, rows]) => {
                const dayNet = totals(rows).net
                return (
                  <Card key={day} className="p-2 sm:p-3">
                    <div className="flex items-center justify-between px-2 pb-1 pt-1.5 text-xs font-medium text-muted">
                      <span>{formatDayHeading(day)}</span>
                      <Money amount={dayNet} sign />
                    </div>
                    <ul>
                      {rows.map((t) => (
                        <TransactionRow key={t.id} t={t} category={byId.get(t.category_id)} nameOf={nameOf} onClick={() => openEdit(t)} />
                      ))}
                    </ul>
                  </Card>
                )
              })}
              {searching && <p className="text-center text-xs text-muted">{filtered.length} resultaten in alle maanden</p>}
            </div>
          )}
        </>
      )}

      {editingRecurring && <RecurringSheet item={editingRecurring} onClose={() => setEditingRecurring(null)} />}
    </div>
  )
}
