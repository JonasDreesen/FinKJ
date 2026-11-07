// Verkleint een foto en zet ze om naar JPEG via een canvas. Bijkomend voordeel:
// alle metadata (EXIF, inclusief GPS-locatie van waar de foto genomen werd)
// gaat daarbij verloren, zodat die nooit geüpload wordt.
export async function resizeImage(file, maxDimension = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/')) throw new Error('Enkel afbeeldingen zijn toegestaan.')
  if (file.size > 25 * 1024 * 1024) throw new Error('Afbeelding is te groot.')

  const bitmap = await loadImage(file)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Omzetten mislukt'))), 'image/jpeg', quality)
  })
}

async function loadImage(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // val terug op <img>
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Kon de afbeelding niet lezen'))
    }
    img.src = url
  })
}
