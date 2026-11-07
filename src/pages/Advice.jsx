import { useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, Scale } from 'lucide-react'
import { Card, CardHeader, Field, Money, PageHeader } from '../components/ui'
import { useTransactions } from '../hooks/useData'
import { monthRange, monthStart, shiftMonth } from '../lib/dates'
import { inRange } from '../lib/finance'
import { formatMoney, parseAmount, sum } from '../lib/format'

const GUIDELINES = [
  {
    key: 'wonen',
    label: 'Wonen (huur/lening + energie)',
    min: 25,
    max: 35,
    color: '#533afd',
    note: 'Wikifin en het Nibud raden aan de totale woonkost (afbetaling of huur, plus energie en water) onder 35% van het netto-inkomen te houden. Boven 40% wordt een tegenslag snel een probleem.',
  },
  {
    key: 'boodschappen',
    label: 'Boodschappen & huishouden',
    min: 8,
    max: 15,
    color: '#10b981',
    note: 'Rond 8% voor een gemiddeld huishouden; met kinderen of hogere voedingskosten is 12–15% realistischer.',
  },
  {
    key: 'vervoer',
    label: 'Vervoer',
    min: 5,
    max: 10,
    color: '#f59e0b',
    note: 'Maximaal 5–10%, afhankelijk van een eigen wagen of vooral openbaar vervoer.',
  },
  {
    key: 'vaste_kosten',
    label: 'Verzekeringen, telecom & abonnementen',
    min: 5,
    max: 10,
    color: '#a855f7',
    note: 'Familiale, hospitalisatie, internet, gsm en vaste abonnementen samen.',
  },
  {
    key: 'sparen',
    label: 'Sparen & beleggen',
    min: 10,
    max: 20,
    color: '#14b8a6',
    note: 'Het Nibud hanteert 10% als minimum; de 50/30/20-regel gaat voor 20%, inclusief extra aflossingen.',
  },
  {
    key: 'vrije_tijd',
    label: 'Vrije tijd & persoonlijk',
    min: 15,
    max: 25,
    color: '#ec4899',
    note: "Kleding, hobby's, uit eten, cadeaus. Het 'wensen'-deel uit de 50/30/20-regel.",
  },
  {
    key: 'buffer',
    label: 'Buffer / onvoorzien',
    min: 5,
    max: 5,
    color: '#64748b',
    note: 'Een vaste marge voor wat niet elke maand terugkomt: herstellingen, medische kosten, …',
  },
]

export default function Advice() {
  const { transactions } = useTransactions()

  const averageIncome = useMemo(() => {
    const months = [1, 2, 3].map((i) => monthRange(shiftMonth(monthStart(), -i)))
    const total = sum(
      transactions.filter((t) => t.type === 'income' && months.some((r) => inRange(t, r))),
      (t) => t.amount,
    )
    return Math.round(total / 3)
  }, [transactions])

  const [input, setInput] = useState('')
  const income = input === '' ? averageIncome || 2500 : parseAmount(input) || 0

  return (
    <div className="space-y-5">
      <PageHeader title="Budgetadvies" subtitle="Hoe verdeel je jullie inkomen het best?" />

      <Card className="p-5">
        <CardHeader title="De 50/30/20-regel" icon={Scale} subtitle="De snelste vuistregel" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { pct: 50, title: 'Noodzakelijk', text: 'Wonen, energie, verzekeringen, boodschappen', color: 'from-brand-500 to-brand-700' },
            { pct: 30, title: 'Wensen', text: "Vrije tijd, kleding, uit eten, hobby's", color: 'from-pink-500 to-rose-600' },
            { pct: 20, title: 'Sparen', text: 'Sparen, beleggen, extra aflossen', color: 'from-teal-500 to-emerald-600' },
          ].map((b) => (
            <div key={b.pct} className={`rounded-3xl bg-gradient-to-br ${b.color} p-4 text-white`}>
              <p className="text-3xl font-semibold">{b.pct}%</p>
              <p className="font-medium">{b.title}</p>
              <p className="text-sm text-white/80">{b.text}</p>
              <Money amount={(income * b.pct) / 100} className="mt-2 block text-lg font-semibold" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader title="Per categorie" icon={BookOpen} />
        <Field
          label="Netto-inkomen per maand, samen (€)"
          hint={averageIncome ? `Standaard jullie gemiddelde van de laatste 3 maanden (${formatMoney(averageIncome)}).` : undefined}
          className="mb-5 max-w-xs"
        >
          <input
            className="input money"
            inputMode="decimal"
            placeholder={String(averageIncome || 2500)}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Field>
        <ul className="space-y-5">
          {GUIDELINES.map((g) => (
            <li key={g.key}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                <span className="font-medium">{g.label}</span>
                <span className="text-muted">
                  {g.min === g.max ? `${g.min}%` : `${g.min}–${g.max}%`} ·{' '}
                  <Money amount={(income * g.min) / 100} className="font-semibold text-ink" />
                  {g.min !== g.max && (
                    <>
                      {' – '}
                      <Money amount={(income * g.max) / 100} className="font-semibold text-ink" />
                    </>
                  )}
                </span>
              </div>
              <div className="relative mb-1.5 h-2 rounded-pill bg-surface-2">
                <div className="absolute inset-y-0 left-0 rounded-pill opacity-40" style={{ width: `${g.max * 2}%`, backgroundColor: g.color }} />
                <div className="absolute inset-y-0 left-0 rounded-pill" style={{ width: `${g.min * 2}%`, backgroundColor: g.color }} />
              </div>
              <p className="text-xs text-muted">{g.note}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <CardHeader title="Eerlijk verdelen met z'n tweeën" icon={Scale} />
        <div className="space-y-3 text-sm text-muted">
          <p>
            <strong className="text-ink">50/50</strong> — eenvoudig, en werkt goed als jullie inkomens vergelijkbaar zijn.
            Dit is wat de app standaard verrekent bij gedeelde kosten.
          </p>
          <p>
            <strong className="text-ink">Naar inkomen</strong> — wie meer verdient, draagt meer. Verdien je 60% van het
            gezamenlijke inkomen, dan betaal je 60% van de vaste kosten. Vaak eerlijker bij een groot verschil.
          </p>
          <p>
            Markeer gezamenlijke kosten als <em>gedeeld</em> en kies wie betaalde: bij <em>Samen</em> zie je dan meteen wie hoeveel
            voorschoot.
          </p>
        </div>
      </Card>

      <div className="flex gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>
          Algemene richtlijnen, geen persoonlijk financieel advies. Kinderen, schulden of gezondheid kunnen redenen zijn om af
          te wijken. Twijfel je? Raadpleeg een erkend adviseur of budgetconsulent (bv. via het OCMW of Wikifin.be).
        </p>
      </div>
      <p className="px-1 text-xs text-muted">
        Bronnen: Wikifin.be (FSMA), Nibud, Test-Aankoop en de 50/30/20-regel zoals gangbaar bij Belgische en Nederlandse
        banken.
      </p>
    </div>
  )
}
