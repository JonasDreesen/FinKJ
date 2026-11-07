import { useMemo, useState } from 'react'
import { ArrowRight, HandCoins, History, Info, Trash2, Users } from 'lucide-react'
import { Card, CardHeader, EmptyState, Field, Money, MonthSwitcher, PageHeader, Segmented, Sheet } from '../components/ui'
import { useMembers, useSettlements, useSharedBalance, useTransactions } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatDate, monthRange, monthStart } from '../lib/dates'
import { inRange } from '../lib/finance'
import { formatMoney, parseAmount, sum } from '../lib/format'
import * as api from '../lib/api'

function SettleSheet({ balance, me, partner, onClose }) {
  const { toast, showError } = useToast()
  const partnerOwesMe = balance > 0
  const [payer, setPayer] = useState(partnerOwesMe ? partner.user_id : me.user_id)
  const [amount, setAmount] = useState(Math.abs(balance).toFixed(2).replace('.', ','))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const receiver = payer === me.user_id ? partner : me
  const payerName = payer === me.user_id ? me.display_name : partner.display_name

  async function submit(e) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!(value > 0)) return showError(null, 'Vul een bedrag in.')
    setSaving(true)
    try {
      await api.createSettlement({ amount: value, note, paid_by: payer })
      toast('Afrekening geregistreerd')
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
      title="Afrekenen"
      footer={
        <button form="settle-form" className="btn btn-primary w-full" disabled={saving}>
          Registreren
        </button>
      }
    >
      <form id="settle-form" onSubmit={submit} className="space-y-4">
        <Segmented
          className="w-full"
          value={payer}
          onChange={setPayer}
          options={[
            { value: me.user_id, label: `${me.display_name} betaalt` },
            { value: partner.user_id, label: `${partner.display_name} betaalt` },
          ]}
        />
        <p className="flex items-center justify-center gap-2 text-sm text-muted">
          {payerName} <ArrowRight size={15} /> {receiver.display_name}
        </p>
        <input
          className="input money text-center text-3xl font-semibold"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Bedrag"
        />
        <Field label="Notitie (optioneel)">
          <input className="input" maxLength={200} placeholder="bv. overschrijving" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <p className="flex gap-2 rounded-2xl bg-surface-2 p-3 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" />
          Dit registreert enkel dat het geld is overgemaakt — de app verplaatst zelf geen geld.
        </p>
      </form>
    </Sheet>
  )
}

export default function Together() {
  const { user } = useAuth()
  const { me, partner, nameOf } = useMembers()
  const { balance } = useSharedBalance()
  const { settlements } = useSettlements()
  const { transactions } = useTransactions()
  const { removeWithUndo } = useToast()
  const [month, setMonth] = useState(monthStart())
  const [settling, setSettling] = useState(false)

  const shared = useMemo(() => {
    const range = monthRange(month)
    return transactions.filter((t) => t.is_shared && t.type === 'expense' && inRange(t, range))
  }, [transactions, month])

  const total = sum(shared, (t) => t.amount)
  const byPayer = (id) => sum(shared.filter((t) => (t.paid_by || t.user_id) === id), (t) => t.amount)

  if (!partner || !me) {
    return (
      <div>
        <PageHeader title="Samen" />
        <Card>
          <EmptyState icon={Users} title="Nog geen partner gekoppeld" text="Zodra een tweede lid is toegevoegd, zie je hier jullie gedeelde balans." />
        </Card>
      </div>
    )
  }

  const settled = Math.abs(balance) < 0.01

  return (
    <div className="space-y-5">
      <PageHeader title="Samen" subtitle={`Gedeelde kosten van ${me.display_name} & ${partner.display_name}`} />

      <section className="rounded-4xl bg-gradient-to-br from-violet-500 to-brand-700 p-6 text-white shadow-lift">
        <p className="text-sm text-white/75">Gedeelde balans</p>
        {settled ? (
          <p className="mt-1 text-3xl font-semibold">Jullie staan quitte ✓</p>
        ) : (
          <>
            <p className="mt-1 text-sm">{balance > 0 ? `${partner.display_name} is jou verschuldigd` : `Jij bent ${partner.display_name} verschuldigd`}</p>
            <Money amount={Math.abs(balance)} className="block text-[40px] font-semibold leading-tight tracking-tight" />
          </>
        )}
        <p className="mt-3 text-xs text-white/70">Gedeelde uitgaven worden 50/50 verdeeld over wie ze betaalde.</p>
        {!settled && (
          <button className="btn mt-4 bg-white text-brand-700 hover:bg-white/90" onClick={() => setSettling(true)}>
            <HandCoins size={18} /> Afrekenen
          </button>
        )}
      </section>

      <Card className="p-5">
        <CardHeader title="Gedeelde uitgaven" icon={Users} action={<MonthSwitcher date={month} onChange={setMonth} />} />
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-surface-2 p-3">
            <p className="text-[11px] text-muted">Totaal</p>
            <Money amount={total} className="text-sm font-semibold" />
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <p className="truncate text-[11px] text-muted">{me.display_name} betaalde</p>
            <Money amount={byPayer(user.id)} className="text-sm font-semibold" />
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <p className="truncate text-[11px] text-muted">{partner.display_name} betaalde</p>
            <Money amount={byPayer(partner.user_id)} className="text-sm font-semibold" />
          </div>
        </div>
        {shared.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">Geen gedeelde uitgaven in deze maand.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {shared.slice(0, 12).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{t.description || 'Gedeelde uitgave'}</span>
                  <span className="text-xs text-muted">
                    {formatDate(t.occurred_on, { day: 'numeric', month: 'short' })} · betaald door {nameOf(t.paid_by || t.user_id)}
                  </span>
                </span>
                <Money amount={t.amount} className="font-semibold" />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <CardHeader title="Afrekeningen" icon={History} />
        {settlements.length === 0 ? (
          <p className="py-2 text-sm text-muted">Nog geen afrekeningen geregistreerd.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {settlements.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium">
                    {nameOf(s.paid_by)} → {nameOf(s.paid_by === user.id ? partner.user_id : user.id)}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {formatDate(s.settled_on)}
                    {s.note ? ` · ${s.note}` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Money amount={s.amount} className="font-semibold" />
                  {s.user_id === user.id && (
                    <button
                      className="icon-btn"
                      aria-label="Verwijderen"
                      onClick={() =>
                        removeWithUndo({
                          key: s.id,
                          message: `Afrekening van ${formatMoney(s.amount)} verwijderd`,
                          commit: () => api.deleteSettlement(s.id),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {settling && <SettleSheet balance={balance} me={me} partner={partner} onClose={() => setSettling(false)} />}
    </div>
  )
}
