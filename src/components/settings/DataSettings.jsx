import { useMemo, useRef, useState } from 'react'
import { Database, Download, FileSpreadsheet, Landmark, Upload } from 'lucide-react'
import { Card, CardHeader, Money, Sheet } from '../ui'
import { useCategories, useMembers, useTags, useTransactions } from '../../hooks/useData'
import { useToast } from '../../context/ToastContext'
import { downloadCsv, parseCsv, parseCsvDate, toCsv } from '../../lib/csv'
import { downloadFullBackup } from '../../lib/backup'
import { parseAmount, sum } from '../../lib/format'
import { todayISO, yearRange } from '../../lib/dates'
import { inRange } from '../../lib/finance'
import * as api from '../../lib/api'

const HEADERS = ['datum', 'type', 'bedrag', 'omschrijving', 'categorie', 'gedeeld', 'betaald_door', 'tags']

function TaxSheet({ onClose }) {
  const { transactions } = useTransactions()
  const { categories, byId } = useCategories()
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear - (new Date().getMonth() < 3 ? 1 : 0))

  const rows = useMemo(() => {
    const range = yearRange(year)
    return transactions
      .filter((t) => t.type === 'expense' && byId.get(t.category_id)?.tax_deductible && inRange(t, range))
      .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))
  }, [transactions, byId, year])

  const perCategory = useMemo(() => {
    const map = new Map()
    for (const t of rows) map.set(t.category_id, (map.get(t.category_id) || 0) + Number(t.amount))
    return [...map.entries()].map(([id, total]) => ({ name: byId.get(id)?.name, total }))
  }, [rows, byId])

  function download() {
    const lines = rows.map((t) => [t.occurred_on, byId.get(t.category_id)?.name || '', Number(t.amount), t.description || ''])
    lines.push([])
    perCategory.forEach((c) => lines.push(['', `Totaal ${c.name}`, Math.round(c.total * 100) / 100, '']))
    lines.push(['', 'Totaal', Math.round(sum(rows, (t) => t.amount) * 100) / 100, ''])
    downloadCsv(`fiscaal-overzicht-${year}.csv`, toCsv(['datum', 'categorie', 'bedrag', 'omschrijving'], lines))
  }

  const fiscalCount = categories.filter((c) => c.tax_deductible).length

  return (
    <Sheet
      open
      onClose={onClose}
      title="Fiscaal jaaroverzicht"
      footer={
        <button className="btn btn-primary w-full" onClick={download} disabled={!rows.length}>
          <Download size={17} /> Downloaden (CSV)
        </button>
      }
    >
      <div className="space-y-4">
        <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Jaar">
          {[0, 1, 2, 3].map((i) => (
            <option key={i} value={thisYear - i}>
              Inkomstenjaar {thisYear - i}
            </option>
          ))}
        </select>
        {fiscalCount === 0 ? (
          <p className="text-sm text-muted">Markeer eerst categorieën als &lsquo;fiscaal aftrekbaar&rsquo; (hieronder bij Categorieën).</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">Geen fiscaal aftrekbare uitgaven in {year}.</p>
        ) : (
          <ul className="divide-y divide-line/60 rounded-2xl border border-line px-4">
            {perCategory.map((c) => (
              <li key={c.name} className="flex justify-between py-2.5 text-sm">
                <span>{c.name}</span>
                <Money amount={c.total} className="font-semibold" />
              </li>
            ))}
            <li className="flex justify-between py-2.5 text-sm font-semibold">
              <span>Totaal ({rows.length} uitgaven)</span>
              <Money amount={sum(rows, (t) => t.amount)} />
            </li>
          </ul>
        )}
        <p className="text-xs text-muted">Bewaar ook de bijhorende attesten: dit overzicht vervangt die niet.</p>
      </div>
    </Sheet>
  )
}

function ImportSheet({ parsed, onClose }) {
  const { toast, showError } = useToast()
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    try {
      const n = await api.importTransactions(parsed.valid)
      toast(`${n} transactie(s) geïmporteerd`)
      onClose()
    } catch (error) {
      showError(error, 'Importeren mislukt.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="CSV importeren"
      footer={
        <button className="btn btn-primary w-full" onClick={run} disabled={busy || !parsed.valid.length}>
          {busy ? 'Bezig…' : `${parsed.valid.length} importeren`}
        </button>
      }
    >
      <ul className="space-y-2 text-sm">
        <li>
          ✅ <strong>{parsed.valid.length}</strong> geldige rijen
        </li>
        {parsed.duplicates > 0 && (
          <li>
            ↺ <strong>{parsed.duplicates}</strong> overgeslagen (staan er al in: zelfde datum, bedrag en omschrijving)
          </li>
        )}
        {parsed.invalid > 0 && (
          <li>
            ⚠️ <strong>{parsed.invalid}</strong> ongeldige rijen overgeslagen (datum, type of bedrag onleesbaar)
          </li>
        )}
      </ul>
      <p className="mt-4 text-xs text-muted">
        Verwachte kolommen: datum, type (uitgave/inkomst), bedrag, en optioneel omschrijving, categorie, gedeeld (ja/nee).
        Negatieve bedragen worden als uitgave gelezen.
      </p>
    </Sheet>
  )
}

export default function DataSettings() {
  const { transactions } = useTransactions()
  const { categories, byId } = useCategories()
  const { byId: tagsById } = useTags()
  const { nameOf } = useMembers()
  const { toast, showError } = useToast()
  const fileRef = useRef(null)
  const [sheet, setSheet] = useState(null)
  const [busy, setBusy] = useState(false)

  function exportCsv() {
    const rows = transactions.map((t) => [
      t.occurred_on,
      t.type === 'income' ? 'inkomst' : 'uitgave',
      Number(t.amount),
      t.description || '',
      byId.get(t.category_id)?.name || '',
      t.is_shared ? 'ja' : 'nee',
      t.is_shared ? nameOf(t.paid_by || t.user_id) : '',
      (t.transaction_tags || []).map((tt) => tagsById.get(tt.tag_id)?.name).filter(Boolean).join(', '),
    ])
    downloadCsv(`finkj-transacties-${todayISO()}.csv`, toCsv(HEADERS, rows))
    toast(`${rows.length} transacties geëxporteerd`)
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return showError(null, 'Bestand is te groot (max. 5 MB).')
    const rows = parseCsv(await file.text())
    if (rows.length < 2) return showError(null, 'Leeg of onleesbaar bestand.')
    const header = rows[0].map((h) => h.trim().toLowerCase())
    const col = (...names) => header.findIndex((h) => names.includes(h))
    const idx = {
      date: col('datum', 'date'),
      type: col('type', 'soort'),
      amount: col('bedrag', 'amount'),
      desc: col('omschrijving', 'description', 'beschrijving'),
      cat: col('categorie', 'category'),
      shared: col('gedeeld', 'scope', 'shared'),
    }
    if (idx.date < 0 || idx.amount < 0) return showError(null, 'Kolommen "datum" en "bedrag" zijn verplicht.')

    const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))
    const existing = new Set(transactions.map((t) => `${t.occurred_on}|${Number(t.amount)}|${(t.description || '').trim().toLowerCase()}`))
    const result = { valid: [], invalid: 0, duplicates: 0 }

    for (const row of rows.slice(1)) {
      const date = parseCsvDate(row[idx.date])
      let amount = parseAmount(row[idx.amount])
      const rawType = idx.type >= 0 ? String(row[idx.type]).trim().toLowerCase() : ''
      let type = ['income', 'inkomst', 'inkomen', 'in'].includes(rawType)
        ? 'income'
        : ['expense', 'uitgave', 'uit'].includes(rawType)
          ? 'expense'
          : null
      if (amount < 0) {
        type = type || 'expense'
        amount = Math.abs(amount)
      }
      type = type || 'expense'
      if (!date || !(amount > 0) || amount > 100_000_000) {
        result.invalid += 1
        continue
      }
      const description = idx.desc >= 0 ? String(row[idx.desc] || '').trim().slice(0, 300) : ''
      const key = `${date}|${amount}|${description.toLowerCase()}`
      if (existing.has(key)) {
        result.duplicates += 1
        continue
      }
      existing.add(key)
      const sharedRaw = idx.shared >= 0 ? String(row[idx.shared]).trim().toLowerCase() : ''
      result.valid.push({
        type,
        amount,
        description,
        category_id: idx.cat >= 0 ? categoryByName.get(String(row[idx.cat]).trim().toLowerCase()) || null : null,
        occurred_on: date,
        is_shared: ['ja', 'gedeeld', 'yes', 'true', '1'].includes(sharedRaw),
      })
    }
    setSheet({ kind: 'import', parsed: result })
  }

  async function backup() {
    setBusy(true)
    try {
      await downloadFullBackup()
      toast('Back-up gedownload')
    } catch (error) {
      showError(error, 'Back-up mislukt.')
    } finally {
      setBusy(false)
    }
  }

  const actions = [
    { icon: FileSpreadsheet, title: 'Exporteren naar Excel (CSV)', text: `${transactions.length} transacties`, onClick: exportCsv },
    { icon: Upload, title: 'Importeren uit CSV', text: 'Bv. uit een export van je bank', onClick: () => fileRef.current?.click() },
    { icon: Landmark, title: 'Fiscaal jaaroverzicht', text: 'Aftrekbare uitgaven per jaar', onClick: () => setSheet({ kind: 'tax' }) },
    { icon: Database, title: 'Volledige back-up (JSON)', text: busy ? 'Bezig…' : 'Alle gegevens, zonder geheime sleutels', onClick: backup },
  ]

  return (
    <Card className="p-5">
      <CardHeader title="Gegevens" icon={Database} />
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
      <ul className="-mx-2">
        {actions.map((a) => (
          <li key={a.title}>
            <button className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-surface-2" onClick={a.onClick} disabled={busy}>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-2 text-muted">
                <a.icon size={18} />
              </span>
              <span>
                <span className="block text-sm font-medium">{a.title}</span>
                <span className="block text-xs text-muted">{a.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {sheet?.kind === 'tax' && <TaxSheet onClose={() => setSheet(null)} />}
      {sheet?.kind === 'import' && <ImportSheet parsed={sheet.parsed} onClose={() => setSheet(null)} />}
    </Card>
  )
}
