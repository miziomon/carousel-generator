import { saveAs } from 'file-saver'
import { exportSlideToPng } from './exportPng.jsx'
import { slugifyTitle } from './filename.js'

/**
 * Esporta tutte le slide come ZIP contenente PNG + JSON.
 * @param {object} carousel  - oggetto carousel completo
 * @param {function} onProgress - callback({ current, total, label })
 */
export async function exportCarouselZip(carousel, onProgress) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const { slides, theme } = carousel
  const total = slides.length
  const padLen = String(total).length

  for (let i = 0; i < total; i++) {
    const slide = slides[i]
    const num = String(i + 1).padStart(Math.max(padLen, 2), '0')
    const filename = `slide-${num}.png`

    onProgress?.({ current: i + 1, total, label: `Esporto slide ${i + 1}/${total}…` })

    const dataUrl = await exportSlideToPng(slide, theme, total)
    // data URL → Uint8Array (rimuove "data:image/png;base64,")
    const base64 = dataUrl.split(',')[1]
    zip.file(filename, base64, { base64: true })
  }

  // Aggiunge il JSON pulito (senza id runtime), nome basato sul titolo del progetto
  const cleanJson = JSON.stringify(
    { ...carousel, slides: carousel.slides.map(({ id: _id, ...rest }) => rest) },
    null,
    2
  )
  zip.file(`${slugifyTitle(carousel.title)}.json`, cleanJson)

  onProgress?.({ current: total, total, label: 'Compressione ZIP…' })

  const blob = await zip.generateAsync({ type: 'blob' })
  // Nome ZIP basato sul titolo del progetto (non sull'autore)
  const zipName = `${slugifyTitle(carousel.title)}.zip`
  saveAs(blob, zipName)
}
