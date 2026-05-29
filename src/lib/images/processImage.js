const MAX_DIMENSION = 1080
const QUALITY = 0.85
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Processa un File caricato dall'utente: resize a max 1080px lato lungo,
 * compressione JPEG quality 0.85, output base64 data URL.
 * Converte sempre in JPEG: non adatto per immagini con trasparenza.
 *
 * @param {File} file
 * @returns {Promise<string>} Data URL JPEG
 * @throws {Error} se MIME non supportato o file troppo grande
 */
export async function processImageFile(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Formato non supportato. Usa JPG, PNG o WebP.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File troppo grande. Massimo 10MB.')
  }

  const bitmap = await createImageBitmap(file)
  const { width: srcW, height: srcH } = bitmap

  let targetW = srcW
  let targetH = srcH
  if (Math.max(srcW, srcH) > MAX_DIMENSION) {
    const ratio = MAX_DIMENSION / Math.max(srcW, srcH)
    targetW = Math.round(srcW * ratio)
    targetH = Math.round(srcH * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  bitmap.close()

  return canvas.toDataURL('image/jpeg', QUALITY)
}

/**
 * Come processImageFile ma preserva il canale alpha:
 * PNG e WebP in input vengono emessi come PNG (lossless, alpha intatta);
 * JPEG in input viene emesso come JPEG (nessuna alpha da preservare).
 * Adatto per sticker e overlay con trasparenza.
 *
 * @param {File} file
 * @returns {Promise<string>} Data URL PNG o JPEG
 * @throws {Error} se MIME non supportato o file troppo grande
 */
export async function processImageFilePreserveAlpha(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Formato non supportato. Usa JPG, PNG o WebP.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File troppo grande. Massimo 10MB.')
  }

  const bitmap = await createImageBitmap(file)
  const { width: srcW, height: srcH } = bitmap

  let targetW = srcW
  let targetH = srcH
  if (Math.max(srcW, srcH) > MAX_DIMENSION) {
    const ratio = MAX_DIMENSION / Math.max(srcW, srcH)
    targetW = Math.round(srcW * ratio)
    targetH = Math.round(srcH * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  bitmap.close()

  // JPEG non ha alpha → JPEG; PNG/WebP → PNG per preservare trasparenza
  if (file.type === 'image/jpeg') {
    return canvas.toDataURL('image/jpeg', QUALITY)
  }
  return canvas.toDataURL('image/png')
}

/**
 * Stessa pipeline di processImageFile (resize + compress JPEG),
 * ma restituisce un File pronto per l'upload multipart invece del data URL.
 *
 * @param {File} file
 * @returns {Promise<File>} File JPEG ottimizzato
 */
export async function processImageToBlob(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Formato non supportato. Usa JPG, PNG o WebP.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File troppo grande. Massimo 10MB.')
  }

  const bitmap = await createImageBitmap(file)
  const { width: srcW, height: srcH } = bitmap

  let targetW = srcW
  let targetH = srcH
  if (Math.max(srcW, srcH) > MAX_DIMENSION) {
    const ratio = MAX_DIMENSION / Math.max(srcW, srcH)
    targetW = Math.round(srcW * ratio)
    targetH = Math.round(srcH * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Conversione immagine fallita.')); return }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
      },
      'image/jpeg',
      QUALITY,
    )
  })
}
