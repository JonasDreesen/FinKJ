// Tekstherkenning op bonnetjes, volledig in de browser. De OCR-bestanden worden
// door de app zelf gehost (zie scripts/copy-ocr-assets.mjs): de foto verlaat
// je toestel hiervoor niet.

const base = `${import.meta.env.BASE_URL}ocr/`

export async function extractReceiptText(file, onProgress) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(['nld', 'eng'], 1, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}core`,
    langPath: `${base}lang`,
    workerBlobURL: false,
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress)
    },
  })
  try {
    const {
      data: { text },
    } = await worker.recognize(file)
    return (text || '').trim()
  } finally {
    await worker.terminate()
  }
}

const AMOUNT = /(\d{1,3}(?:[.\s]\d{3})*|\d+)[.,](\d{2})(?!\d)/g
const TOTAL_WORDS = /(totaal|total|te betalen|bedrag|som|t[eo]tal|subtotaal|bancontact|visa|mastercard|cash|contant)/i

function amountsIn(line) {
  return [...line.matchAll(AMOUNT)]
    .map((m) => Number(`${m[1].replace(/[.\s]/g, '')}.${m[2]}`))
    .filter((n) => n > 0 && n < 100000)
}

// Zoekt eerst een bedrag op een regel met "totaal"/"te betalen"; anders het
// grootste bedrag op het bonnetje.
export function guessAmountFromText(text) {
  if (!text) return null
  const lines = text.split(/\r?\n/)
  const totalLines = lines.filter((l) => TOTAL_WORDS.test(l) && !/sub/i.test(l))
  for (const line of totalLines.reverse()) {
    const found = amountsIn(line)
    if (found.length) return Math.max(...found)
  }
  const all = lines.flatMap(amountsIn)
  return all.length ? Math.max(...all) : null
}

// Eerste betekenisvolle regel = meestal de naam van de winkel.
export function guessMerchantFromText(text) {
  if (!text) return ''
  const line = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[^\p{L}\p{N}&' .-]/gu, '').trim())
    .find((l) => l.length >= 3 && /\p{L}{3}/u.test(l))
  return line ? line.slice(0, 60) : ''
}

export function guessDateFromText(text) {
  const m = text?.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/)
  if (!m) return null
  const year = m[3].length === 2 ? `20${m[3]}` : m[3]
  const date = new Date(Number(year), Number(m[2]) - 1, Number(m[1]))
  if (date.getMonth() !== Number(m[2]) - 1 || date > new Date()) return null
  return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}
