/**
 * Utility per manipolazione e confronto colori.
 * Wrapper su color2k — importa SOLO da questo modulo, mai da color2k direttamente.
 * Così se cambiamo libreria toccheremo solo questo file.
 */
import { lighten, darken, getLuminance, parseToRgba, toHex } from 'color2k'

// ─── Normalizzazione ──────────────────────────────────────────────────────────

/**
 * Normalizza qualsiasi stringa CSS colore in formato rgba canali [r,g,b,a].
 * Ritorna null se il parsing fallisce.
 * @param {string} color
 * @returns {[number,number,number,number]|null}
 */
export function parseColor(color) {
  try {
    return parseToRgba(color) // → [r, g, b, a] 0-255 / 0-1
  } catch {
    return null
  }
}

/**
 * Confronta due stringhe colore ignorando formato (hex/rgba/shorthand/case).
 * Normalizza entrambe in rgba e confronta canale per canale con tolleranza ±1
 * per errori di arrotondamento nelle conversioni.
 *
 * Non confrontiamo stringhe raw perché 'rgba(232,232,232,0.45)' e '#e8e8e872'
 * sono lo stesso colore ma stringhe diverse.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function colorsEqual(a, b) {
  if (a === b) return true // fast path
  const pa = parseColor(a)
  const pb = parseColor(b)
  if (!pa || !pb) return false
  // Tolleranza ±1 per errori di round-trip hex→rgb
  return (
    Math.abs(pa[0] - pb[0]) <= 1 &&
    Math.abs(pa[1] - pb[1]) <= 1 &&
    Math.abs(pa[2] - pb[2]) <= 1 &&
    Math.abs(pa[3] - pb[3]) <= 0.01
  )
}

// ─── Inferenza surface ────────────────────────────────────────────────────────

/**
 * Calcola un colore "surface" di fallback a partire dal background.
 * Usato nella migrazione di caroselli senza il campo surface.
 *
 * Scelta di design: uno shift leggero nella direzione opposta alla luminance.
 * Sfondo scuro → surface leggermente più chiaro; sfondo chiaro → leggermente più scuro.
 * Non è un colore "perfetto" — l'utente può poi sovrascriverlo manualmente.
 *
 * Output sempre in hex per stabilità del confronto in matchBuiltin.
 *
 * @param {string} background — stringa CSS colore
 * @returns {string} — hex colore
 */
export function inferSurface(background) {
  try {
    const lum = getLuminance(background)
    const shifted = lum < 0.5
      ? lighten(background, 0.06)   // scuro → schiarisci
      : darken(background, 0.04)    // chiaro → scurisci
    return toHex(shifted)
  } catch {
    // Se il parsing del background fallisce, restituiamo un grigio neutro
    return '#808080'
  }
}

// ─── Contrasto WCAG ──────────────────────────────────────────────────────────

/**
 * Calcola il rapporto di contrasto WCAG 2.1 tra due colori.
 * Range: 1.0 (nessun contrasto) → 21.0 (bianco su nero).
 * Usato da useContrastCheck (Fase 2).
 *
 * @param {string} fg — colore primo piano
 * @param {string} bg — colore sfondo
 * @returns {number}
 */
export function contrastRatio(fg, bg) {
  try {
    const l1 = getLuminance(fg)
    const l2 = getLuminance(bg)
    const lighter = Math.max(l1, l2)
    const darker  = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
  } catch {
    return 1
  }
}
