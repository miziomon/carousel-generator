/**
 * Matching automatico tra una palette di colori e le palette built-in.
 * Usato nella migrazione per assegnare palette_id ai caroselli importati.
 *
 * Confrontiamo tutti e 6 i colori (background, surface, foreground, accent,
 * muted, line) con tolleranza ±1 per errori di arrotondamento hex→rgb.
 *
 * Non usiamo solo 3 colori (bg/fg/accent) perché vogliamo certezza assoluta:
 * palette_id deve essere affidabile come "source of truth" per il badge
 * in-sync/modificata (Fase 2). Un match parziale creerebbe falsi positivi.
 *
 * @param {object} colors — { background, surface, foreground, accent, muted, line }
 * @returns {string|null} — id della palette built-in, o null
 */
import { BUILTIN_PALETTES } from './builtinPalettes.js'
import { colorsEqual } from './colorUtils.js'

const COLOR_KEYS = ['background', 'surface', 'foreground', 'accent', 'muted', 'line']

export function matchBuiltin(colors) {
  if (!colors || typeof colors !== 'object') return null

  for (const palette of BUILTIN_PALETTES) {
    const allMatch = COLOR_KEYS.every((key) =>
      colorsEqual(colors[key], palette.colors[key])
    )
    if (allMatch) return palette.id
  }

  return null
}
