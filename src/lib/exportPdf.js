import { saveAs } from 'file-saver'
import { renderSlideAsPng } from './renderSlideAsPng.jsx'
import { getFormat } from './formats/registry.js'
import { slugifyTitle } from './filename.js'

/**
 * Esporta il carosello come PDF multi-pagina per LinkedIn.
 * Usa pixelRatio 1 (vs 2 retina dello ZIP) per contenere il peso del file.
 *
 * @param {object} carousel    - oggetto carosello completo
 * @param {Function} onProgress - callback (current, total, estimatedMB) => void
 * @returns {Promise<{ filename: string, sizeBytes: number }>}
 */
export async function exportCarouselAsPdf(carousel, onProgress) {
  const { jsPDF } = await import('jspdf')

  const { slides, theme } = carousel
  const total = slides.length
  const format = getFormat(theme.format)
  const { width, height } = format
  const orientation = width > height ? 'landscape' : 'portrait'

  const pdf = new jsPDF({
    unit: 'px',
    format: [width, height],
    orientation,
    hotfixes: ['px_scaling'],
  })

  pdf.setProperties({
    title: carousel.title ?? 'Carosello',
    author: theme?.footer?.name ?? '',
    subject: carousel._ai_generation?.input_summary ?? '',
    creator: 'Carosello Builder',
  })

  let cumulativeBytes = 0

  for (let i = 0; i < total; i++) {
    const dataUrl = await renderSlideAsPng(slides[i], theme, total, { pixelRatio: 1 })

    // Stima dimensione cumulativa: base64 → bytes (fattore 0.75)
    cumulativeBytes += Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75)
    const estimatedMB = (cumulativeBytes / 1_000_000).toFixed(1)

    if (i > 0) {
      pdf.addPage([width, height], orientation)
    }

    // addImage accetta data URL PNG direttamente; 'FAST' = compressione veloce interna
    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height, undefined, 'FAST')

    onProgress?.(i + 1, total, estimatedMB)
  }

  const blob = pdf.output('blob')
  const filename = `${slugifyTitle(carousel.title)}-linkedin.pdf`
  saveAs(blob, filename)

  return { filename, sizeBytes: blob.size }
}
