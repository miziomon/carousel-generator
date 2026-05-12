import { PaletteSchema } from '../schema.js'

/**
 * Valida e normalizza un file JSON importato come palette.
 * Supporta sia formato singolo oggetto Palette che wrapper { _type, _version, palette }.
 * Ritorna { ok: true, palette } oppure { ok: false, error: string }.
 *
 * @param {unknown} raw — oggetto gia' parsato da JSON.parse
 * @returns {{ ok: boolean, palette?: object, error?: string }}
 */
export function parseImportedPalette(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Il file non contiene un oggetto JSON valido.' }
  }

  // Supporta sia il formato wrapper (_type + palette) che il formato nudo
  let candidate = raw
  if (raw._type === 'carosello-palette' && raw.palette) {
    candidate = raw.palette
  }

  // Supporta anche array (prende il primo elemento)
  if (Array.isArray(candidate)) {
    if (candidate.length === 0) {
      return { ok: false, error: 'Il file contiene un array vuoto.' }
    }
    candidate = candidate[0]
  }

  // Valida con PaletteSchema — restituisce errore localizzato in italiano al primo issue
  const result = PaletteSchema.safeParse(candidate)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path  = issue.path.join('.') || 'root'
    // Mappa i codici Zod piu' comuni a messaggi leggibili in italiano
    let msg
    if (issue.code === 'invalid_type') {
      msg = 'Campo "' + path + '": tipo non valido (atteso ' + issue.expected + ', ricevuto ' + issue.received + ')'
    } else if (issue.code === 'too_small') {
      msg = 'Campo "' + path + '": valore troppo corto o mancante'
    } else if (issue.code === 'too_big') {
      msg = 'Campo "' + path + '": valore troppo lungo'
    } else if (issue.code === 'invalid_string') {
      msg = 'Campo "' + path + '": formato stringa non valido'
    } else {
      msg = 'Campo "' + path + '": ' + issue.message
    }
    return { ok: false, error: 'Palette non valida: ' + msg }
  }

  return { ok: true, palette: result.data }
}
