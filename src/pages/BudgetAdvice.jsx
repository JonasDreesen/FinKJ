import { useMemo, useState } from 'react'

function formatAmount(amount) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

const CATEGORIES = [
  {
    key: 'wonen',
    label: 'Wonen (huur/lening + energie)',
    min: 25,
    max: 35,
    color: 'bg-brand-500',
    note: 'Wikifin en het Nederlandse Nibud raden beide aan de totale woonkost (afbetaling of huur, plus energie/water) onder de 35% van je netto-inkomen te houden. Boven 40% loop je een reëel risico op betalingsproblemen bij een tegenslag.',
  },
  {
    key: 'boodschappen',
    label: 'Boodschappen & huishouden',
    min: 8,
    max: 15,
    color: 'bg-green-500',
    note: 'Nibud-richtcijfers voor voeding liggen rond 8% van het netto-inkomen voor een gemiddeld huishouden; voor gezinnen met kinderen of hogere voedingskosten is 12-15% realistischer.',
  },
  {
    key: 'vervoer',
    label: 'Vervoer',
    min: 5,
    max: 10,
    color: 'bg-amber-500',
    note: 'Richtlijn is maximaal 5-10% van het netto-inkomen, afhankelijk van of je een eigen wagen hebt of vooral het openbaar vervoer gebruikt.',
  },
  {
    key: 'vaste_kosten',
    label: 'Verzekeringen & vaste kosten (telefoon, internet, abonnementen)',
    min: 5,
    max: 10,
    color: 'bg-purple-500',
    note: 'Verzekeringen (familiale, hospitalisatie, ...), telecom en vaste abonnementen samen: reken op 5-10%.',
  },
  {
    key: 'sparen',
    label: 'Sparen & investeren',
    min: 10,
    max: 20,
    color: 'bg-teal-500',
    note: 'Nibud hanteert 10% als minimum-spaardoel. De bekende 50/30/20-regel gaat verder en trekt hier 20% voor uit, inclusief eventuele extra aflossingen op schulden.',
  },
  {
    key: 'vrije_tijd',
    label: 'Vrije tijd & persoonlijke uitgaven',
    min: 15,
    max: 25,
    color: 'bg-pink-500',
    note: 'Kleding, hobby\'s, uit eten, cadeaus, abonnementen voor plezier. Dit valt samen met het "wensen"-deel (30%) uit de 50/30/20-regel, hier opgesplitst zodat het niet overlapt met vaste abonnementen.',
  },
  {
    key: 'buffer',
    label: 'Buffer / onvoorziene kosten',
    min: 5,
    max: 5,
    color: 'bg-gray-400',
    note: 'Een vaste marge voor zaken die niet elke maand terugkomen (herstellingen, medische kosten, ...). Dit voorkomt dat een goed budget al bij de eerste tegenslag ontspoort.',
  },
]

export default function BudgetAdvice() {
  const [income, setIncome] = useState('2500')
  const netIncome = Number(income) || 0

  const rows = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        ...c,
        amountMin: (netIncome * c.min) / 100,
        amountMax: (netIncome * c.max) / 100,
      })),
    [netIncome],
  )

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Hoe verdeel je jullie loon het best?</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Algemene richtlijnen op basis van erkende bronnen (Wikifin, Nibud, Test-Aankoop en de
        bekende 50/30/20-regel) — geen persoonlijk financieel advies, maar een goed startpunt om
        jullie eigen budgetten op de Budgetten-pagina op af te stemmen.
      </p>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-2 font-semibold">De 50/30/20-regel (snelle vuistregel)</h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          De eenvoudigste en meest gebruikte richtlijn verdeelt je netto-inkomen in drie grote
          delen:
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-brand-50 p-3 dark:bg-brand-900">
            <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">50%</div>
            <div className="text-sm text-brand-900 dark:text-brand-200">
              Noodzakelijke uitgaven: wonen, energie, verzekeringen, boodschappen
            </div>
          </div>
          <div className="rounded-md bg-pink-50 p-3 dark:bg-pink-950">
            <div className="text-2xl font-bold text-pink-700 dark:text-pink-300">30%</div>
            <div className="text-sm text-pink-900 dark:text-pink-200">
              Persoonlijke wensen: vrije tijd, kleding, uit eten, hobby's
            </div>
          </div>
          <div className="rounded-md bg-teal-50 p-3 dark:bg-teal-950">
            <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">20%</div>
            <div className="text-sm text-teal-900 dark:text-teal-200">
              Sparen, investeren en/of schulden extra aflossen
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 font-semibold">Gedetailleerde richtlijn per categorie</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          Vul jullie totale maandelijkse netto-inkomen (samen) in om te zien welk bedrag per
          categorie overeenkomt met de richtlijnen hieronder.
        </p>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Netto-inkomen per maand (samen, €)</label>
          <input
            type="number"
            min="0"
            step="50"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 sm:w-64"
          />
        </div>

        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                <span className="font-medium">{row.label}</span>
                <span className="text-gray-600 dark:text-gray-300">
                  {row.min === row.max ? `${row.min}%` : `${row.min}–${row.max}%`} ·{' '}
                  {row.min === row.max
                    ? formatAmount(row.amountMin)
                    : `${formatAmount(row.amountMin)} – ${formatAmount(row.amountMax)}`}
                </span>
              </div>
              <div className="mb-1 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  className={`h-2 rounded-full ${row.color}`}
                  style={{ width: `${row.max}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{row.note}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-2 font-semibold">Hoe verdeel je dit eerlijk met z'n tweeën?</h2>
        <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
          Voor de <strong>gedeelde</strong> kosten in deze app (wonen, boodschappen als jullie
          samen koken, ...) zijn er twee gangbare aanpakken:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <li>
            <strong>50/50-verdeling</strong>: eenvoudig, werkt goed als jullie inkomens
            vergelijkbaar zijn.
          </li>
          <li>
            <strong>Verdeling naar inkomen (proportioneel)</strong>: wie meer verdient, draagt een
            groter deel van de gedeelde kosten. Vaak als eerlijker ervaren bij een groter
            inkomensverschil — bv. verdien je 60% van het gezamenlijke inkomen, dan betaal je 60%
            van de gedeelde vaste kosten.
          </li>
        </ul>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Welke methode je ook kiest: markeer jullie gezamenlijke kosten in deze app als "Gedeeld"
          op de Transacties-pagina. Het dashboard berekent dan automatisch wie er meer heeft
          voorgeschoten, zodat je makkelijk kan bijhouden of de verdeling in balans blijft.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        <strong>Belangrijk:</strong> dit zijn algemene richtlijnen, geen gepersonaliseerd
        financieel advies. Jullie situatie (kinderen, schulden, regio, gezondheid, ...) kan
        redenen geven om hiervan af te wijken. Twijfel je over jullie specifieke situatie,
        raadpleeg dan een erkend financieel adviseur of budgetconsulent (bv. via het OCMW of
        Wikifin.be).
      </div>

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        Bronnen: Wikifin.be (financiële educatie van de FSMA), Nibud (Nederlands Instituut voor
        Budgetvoorlichting), Test-Aankoop, en de 50/30/20-regel zoals gangbaar toegepast door
        Belgische en Nederlandse banken en financiële dienstverleners.
      </p>
    </div>
  )
}
