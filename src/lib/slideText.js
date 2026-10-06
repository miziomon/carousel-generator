import { parseInlineTags, isSeparator } from '../slide-renderer/inlineTags.jsx'

/**
 * Estrazione del testo in chiaro delle slide, in ordine di lettura.
 * Serve al livello di testo invisibile del PDF e al pulsante "Copia testo accessibile".
 */

// Rimuove i tag inline riusando il parser del render: i tag appaiati spariscono,
// quelli non appaiati restano letterali, esattamente come nella slide visibile.
export function stripInlineTags(text) {
  if (!text) return ''
  return parseInlineTags(text)
    .map((node) => (typeof node === 'string' ? node : node.props.children))
    .join('')
}

// Righe di testo: niente separatori, tag rimossi, righe vuote conservate come pausa
function linesToText(lines = []) {
  return lines
    .filter((line) => !isSeparator(line))
    .map(stripInlineTags)
    .join('\n')
    .trim()
}

/**
 * Testo in chiaro di una singola slide.
 * Ordine: kicker, contenuto principale del tipo, attribuzioni.
 */
export function slideToPlainText(slide, theme) {
  const parts = []

  // Kicker: se non definito sulla slide vale il default del tema (null = nascosto)
  const kicker = slide.kicker === undefined ? theme?.header?.kicker_default : slide.kicker
  if (kicker) parts.push(stripInlineTags(kicker))

  switch (slide.type) {
    case 'divider':
      if (slide.divider_number) parts.push(String(slide.divider_number))
      parts.push(linesToText(slide.lines))
      if (slide.divider_label) parts.push(stripInlineTags(slide.divider_label))
      break
    case 'cta':
      parts.push(...(slide.cta_items ?? []).map(stripInlineTags))
      break
    case 'quote':
      parts.push(linesToText(slide.lines))
      if (slide.author) parts.push(`${slide.author}${slide.source ? `, ${slide.source}` : ''}`)
      else if (slide.source) parts.push(slide.source)
      break
    case 'blank':
      if (slide.caption) parts.push(stripInlineTags(slide.caption))
      break
    default:
      // cover, standard
      parts.push(linesToText(slide.lines))
  }

  return parts.filter(Boolean).join('\n\n')
}

/**
 * Testo in chiaro dell'intero carosello, con intestazione per ogni slide.
 * Pensato per essere incollato nella didascalia o nel primo commento del post.
 */
export function carouselToPlainText(carousel) {
  const { slides, theme } = carousel
  const total = slides.length
  const body = slides
    .map((slide, i) => `Slide ${i + 1} di ${total}\n${slideToPlainText(slide, theme)}`)
    .join('\n\n')
  return carousel.title ? `${carousel.title}\n\n${body}` : body
}
