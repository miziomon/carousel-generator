import { resolveSlideFont } from '../../../lib/fonts/resolveFont.js'

/**
 * Calcola font-size e line-height finali per il body di una slide.
 * Estrae la logica duplicata presente in ogni *CoverSlide, *StandardSlide, ecc.
 *
 * @param {object} slide
 * @param {object} theme
 * @param {object} calib - calibrations[format]
 * @param {string} entryKey - chiave in calib.body_archivo ('cover'|'xl'|'lg'|'md')
 * @returns {{ finalSize: number, finalLH: number, fontVars: object }}
 */
export function computeBodyFont(slide, theme, calib, entryKey) {
  const fontVars  = resolveSlideFont(slide, theme)
  const entry     = calib.body_archivo[entryKey] ?? calib.body_archivo.xl
  const mdSize    = calib.body_archivo.md.size
  const base      = parseFloat(fontVars['--font-size-base'])
  const ratio     = entry.size / mdSize
  const finalSize = Math.round(base * ratio * parseFloat(fontVars['--font-size-multiplier']))
  const lhMult    = slide.line_height_override ?? theme.lineHeight ?? 1
  const finalLH   = +(entry.line_height * parseFloat(fontVars['--font-line-height-multiplier']) * lhMult).toFixed(3)
  return { finalSize, finalLH, fontVars }
}
