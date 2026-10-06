import { saveAs } from 'file-saver'
import { renderSlideAsPng } from './renderSlideAsPng.jsx'
import { getFormat } from './formats/registry.js'
import { slugifyTitle } from './filename.js'
import { slideToPlainText } from './slideText.js'

// Il modello dati non ha un campo lingua: i caroselli sono in italiano
const PDF_LANGUAGE = 'it' // jsPDF non conosce 'it-IT': accetta solo i codici della sua tabella
const TEXT_MARGIN = 40

// Code point rappresentabili nel font standard del PDF (WinAnsi): ASCII, Latin-1 e punteggiatura tipografica
const EXTRA_WINANSI = [0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026, 0x20ac]
const isPdfSafeChar = (ch) => {
  const code = ch.codePointAt(0)
  return code === 10 || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || EXTRA_WINANSI.includes(code)
}

// Scarta emoji e simboli non rappresentabili, per non produrre testo corrotto nel livello invisibile
function toPdfSafeText(text) {
  return [...text].filter(isPdfSafeChar).join('')
}

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

  // Lingua del documento e titolo mostrato al posto del nome file (accessibilità)
  pdf.setLanguage(PDF_LANGUAGE)
  pdf.viewerPreferences({ DisplayDocTitle: true })

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

    // Livello di testo reale ma invisibile sopra l'immagine: screen reader, ricerca e
    // estrazione del testo (anche l'OCR di LinkedIn) leggono la slide in ordine corretto
    const slideText = slideToPlainText(slides[i], theme)
    if (slideText) {
      pdf.setFontSize(24)
      pdf.text(toPdfSafeText(slideText), TEXT_MARGIN, TEXT_MARGIN, {
        renderingMode: 'invisible',
        maxWidth: width - TEXT_MARGIN * 2,
        baseline: 'top',
      })
    }

    // Segnalibro per slide: navigazione per le tecnologie assistive
    const firstLine = toPdfSafeText(slideText.split('\n').find(Boolean) ?? '')
    pdf.outline.add(null, `Slide ${i + 1}${firstLine ? `: ${firstLine}` : ''}`, { pageNumber: i + 1 })

    onProgress?.(i + 1, total, estimatedMB)
  }

  const blob = pdf.output('blob')
  const filename = `${slugifyTitle(carousel.title)}-linkedin.pdf`
  saveAs(blob, filename)

  return { filename, sizeBytes: blob.size }
}
