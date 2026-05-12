import { useMemo } from 'react'
import { contrastRatio } from '../lib/palettes/colorUtils.js'

/**
 * Dato un rapporto di contrasto numerico, restituisce il livello WCAG 2.1.
 *
 * Categorie:
 *   AAA      ≥ 7.0   — testo normale, massima accessibilità
 *   AA       ≥ 4.5   — testo normale, standard minimo
 *   AA-large ≥ 3.0   — testo grande o UI components
 *   Fail     < 3.0   — non conforme
 *
 * @param {number} ratio
 * @returns {'AAA'|'AA'|'AA-large'|'Fail'}
 */
function getLevel(ratio) {
  if (ratio >= 7.0) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3.0) return 'AA-large'
  return 'Fail'
}

/**
 * Calcola i rapporti di contrasto WCAG 2.1 per le coppie di colori chiave.
 * Memoizzato per evitare ricalcoli ad ogni render.
 *
 * @param {object|null} palette — oggetto palette con i 6 colori
 * @returns {Array<{label: string, ratio: number, level: string, pass: boolean}>}
 */
export function useContrastCheck(palette) {
  return useMemo(() => {
    if (!palette) return []

    const checks = [
      {
        label: 'Testo su Sfondo',
        fg: palette.foreground,
        bg: palette.background,
        critical: true,   // warn se sotto AA (ratio < 4.5)
      },
      {
        label: 'Accento su Sfondo',
        fg: palette.accent,
        bg: palette.background,
        critical: false,  // warn solo se sotto AA-large (testo grande, ratio < 3.0)
      },
      {
        label: 'Testo su Superficie',
        fg: palette.foreground,
        bg: palette.surface,
        critical: true,
      },
    ]

    return checks.map(({ label, fg, bg, critical }) => {
      const ratio = contrastRatio(fg, bg)
      const level = getLevel(ratio)
      // critical → soglia AA (4.5), non-critical → soglia AA-large (3.0)
      const pass  = critical ? ratio >= 4.5 : ratio >= 3.0
      return {
        label,
        ratio: Math.round(ratio * 10) / 10,
        level,
        pass,
      }
    })
  }, [palette])
}
