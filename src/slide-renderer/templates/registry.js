import { editorialMarkManifest } from './editorial-mark/manifest.js'
import { boldCornerManifest }    from './bold-corner/manifest.js'

// Lista di template registrati. Per aggiungere un template: creare la cartella,
// importare il manifest qui e aggiungerlo all'array TEMPLATES.
const TEMPLATES = [
  editorialMarkManifest,
  boldCornerManifest,
]

export const DEFAULT_TEMPLATE_ID = 'system-editorial-mark'

/**
 * Restituisce il manifest del template richiesto.
 * Se l'id non è registrato, fa fallback al template di default con warning in console.
 * Non ritorna mai null: garantisce che SlideRenderer abbia sempre un template valido.
 */
export function getTemplate(id) {
  const found = TEMPLATES.find((t) => t.id === id)
  if (!found) {
    if (id) {
      console.warn(`[templates] Template "${id}" non trovato. Fallback a "${DEFAULT_TEMPLATE_ID}".`)
    }
    return TEMPLATES[0]
  }
  return found
}

export { TEMPLATES }
