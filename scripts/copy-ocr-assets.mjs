// Kopieert de OCR-bestanden (Tesseract) naar public/ocr zodat de app ze zelf
// host: geen externe CDN nodig, dus geen code van derden in de browser.
import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nm = (p) => join(root, 'node_modules', p)
const out = join(root, 'public', 'ocr')

const files = [
  [nm('tesseract.js/dist/worker.min.js'), 'worker.min.js'],
  [nm('tesseract.js-core/tesseract-core-lstm.wasm.js'), 'core/tesseract-core-lstm.wasm.js'],
  [nm('tesseract.js-core/tesseract-core-simd-lstm.wasm.js'), 'core/tesseract-core-simd-lstm.wasm.js'],
  [nm('tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js'), 'core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  [nm('@tesseract.js-data/nld/4.0.0_best_int/nld.traineddata.gz'), 'lang/nld.traineddata.gz'],
  [nm('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'), 'lang/eng.traineddata.gz'],
]

for (const [src, dest] of files) {
  if (!existsSync(src)) throw new Error(`OCR-bestand ontbreekt: ${src}`)
  const target = join(out, dest)
  mkdirSync(dirname(target), { recursive: true })
  cpSync(src, target)
}
console.log(`OCR-bestanden gekopieerd naar ${out}`)
