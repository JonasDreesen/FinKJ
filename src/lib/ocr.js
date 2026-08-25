export async function extractReceiptText(file) {
  try {
    const { default: Tesseract } = await import('tesseract.js')
    const {
      data: { text },
    } = await Tesseract.recognize(file, 'nld+eng')
    return text?.trim() || ''
  } catch {
    return ''
  }
}

export function guessAmountFromText(text) {
  if (!text) return null
  const matches = text.match(/(\d{1,4}[.,]\d{2})/g)
  if (!matches || matches.length === 0) return null
  const amounts = matches.map((m) => Number(m.replace(',', '.'))).filter((n) => !Number.isNaN(n) && n > 0)
  if (amounts.length === 0) return null
  return Math.max(...amounts)
}
