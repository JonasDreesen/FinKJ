// CSV in het formaat dat Excel in België/Nederland verwacht: puntkomma als
// scheidingsteken, UTF-8 met BOM zodat é/ë correct getoond worden.

const DELIMITER = ';'

// Een cel die met = + - @ begint, voert Excel uit als formule ("CSV-injectie").
// Zo'n cel krijgt een apostrof ervoor, zodat ze als tekst getoond wordt.
function neutralize(value) {
  if (typeof value === 'number') return String(value).replace('.', ',')
  const str = String(value ?? '')
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
}

function escapeField(value) {
  const str = neutralize(value)
  if (/[";\n\r,]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(escapeField).join(DELIMITER)).join('\r\n')
}

export function parseCsv(text) {
  const input = text.replace(/^\uFEFF/, '')
  const firstLine = input.split(/\r?\n/, 1)[0] || ''
  const delimiter = (firstLine.match(/;/g)?.length || 0) >= (firstLine.match(/,/g)?.length || 0) ? ';' : ','

  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    if (inQuotes) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

// Accepteert 2026-03-31, 31/03/2026 en 31-03-2026.
export function parseCsvDate(value) {
  const v = String(value || '').trim()
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return normalize(m[1], m[2], m[3])
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) return normalize(m[3], m[2], m[1])
  return null
}

function normalize(y, mo, d) {
  const date = new Date(Number(y), Number(mo) - 1, Number(d))
  if (date.getMonth() !== Number(mo) - 1) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCsv(filename, csv) {
  downloadFile(filename, `\uFEFF${csv}`, 'text/csv;charset=utf-8')
}
