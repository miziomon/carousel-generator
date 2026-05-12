/**
 * Slugifica il titolo del progetto per usarlo come nome file negli export.
 * - rimuove diacritici (accenti, dieresi, ecc.)
 * - sostituisce spazi e caratteri non sicuri con "-"
 * - collassa "--" multipli
 * - lowercase, trimma "-" agli estremi
 * - fallback su "carosello" se vuoto/non valido
 */
export function slugifyTitle(title) {
  if (typeof title !== 'string') return 'carosello'

  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || 'carosello'
}
