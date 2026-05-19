/**
 * Ricomprime un data URL base64 (JPEG/PNG/WebP) a un nuovo livello di qualità JPEG.
 * Usa Canvas API — funziona solo in un contesto browser.
 */
async function recompressDataUrl(dataUrl, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Impossibile caricare l\'immagine per la ricompressione'))
    img.src = dataUrl
  })
}

async function recompressBgImage(bgImage, quality) {
  if (!bgImage?.data) return bgImage
  const newData = await recompressDataUrl(bgImage.data, quality)
  return { ...bgImage, data: newData }
}

/**
 * Ricomprime tutte le immagini di sfondo (tema + slide) di un carosello.
 * @param {object} carousel - Carosello completo
 * @param {number} quality  - Qualità JPEG 0–1 (es. 0.85, 0.75)
 * @returns {Promise<object>} Carosello con immagini ricompresse
 */
export async function recompressCarouselImages(carousel, quality) {
  const [newThemeBg, ...newSlideBgs] = await Promise.all([
    recompressBgImage(carousel.theme.background_image, quality),
    ...carousel.slides.map((s) => recompressBgImage(s.background_image, quality)),
  ])

  return {
    ...carousel,
    theme: { ...carousel.theme, background_image: newThemeBg },
    slides: carousel.slides.map((slide, i) => ({
      ...slide,
      background_image: newSlideBgs[i],
    })),
  }
}

/** True se il carosello contiene almeno un'immagine di sfondo con data. */
export function carouselHasImages(carousel) {
  if (carousel.theme.background_image?.data) return true
  return carousel.slides.some((s) => s.background_image?.data)
}
