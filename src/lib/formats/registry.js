import { FORMAT_SQUARE, FORMAT_PORTRAIT, FORMAT_LANDSCAPE } from './builtins.js'

export const FORMATS = [FORMAT_SQUARE, FORMAT_PORTRAIT, FORMAT_LANDSCAPE]

export const DEFAULT_FORMAT_ID = 'square'

/**
 * Ritorna il formato registrato con l'id dato.
 * Se l'id non è registrato, fa fallback a square con warning in console.
 * Non ritorna mai null: garantisce che SlideRenderer abbia sempre un formato valido.
 */
export function getFormat(id) {
  const found = FORMATS.find((f) => f.id === id)
  if (!found) {
    if (id) {
      console.warn(`[formats] Formato "${id}" non trovato. Fallback a "${DEFAULT_FORMAT_ID}".`)
    }
    return FORMAT_SQUARE
  }
  return found
}
