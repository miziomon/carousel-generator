/**
 * Palette built-in del sistema — read-only, immutabili.
 * Vengono usate per il matching automatico durante la migrazione
 * e come preset nel PaletteManager (Fase 3).
 *
 * IMPORTANTE: i valori dei colori sono definitivi (frutto di iterazioni
 * di design già fatte). Non modificarli senza allineare anche
 * defaultCarousel.js e i test di migrazione.
 */

const TECH_DARK = Object.freeze({
  id: 'system-tech-dark',
  name: 'Tech Dark',
  description: 'Sfondo blu notte con accento verde fluo. Identità tech, alto contrasto, leggibile su mobile.',
  origin: 'system',
  colors: Object.freeze({
    background: '#0a0e1a',
    surface:    '#1a1e2a',
    foreground: '#e8e8e8',
    accent:     '#00ffaa',
    muted:      'rgba(232,232,232,0.45)',
    line:       'rgba(232,232,232,0.18)',
  }),
})

const WARM_NEUTRAL = Object.freeze({
  id: 'system-warm-neutral',
  name: 'Warm Neutral',
  description: 'Toni terra-Piemonte, sfondo crema caldo con accento terracotta. Editoriale, riflessivo.',
  origin: 'system',
  colors: Object.freeze({
    background: '#FAF8F5',
    surface:    '#F0EDE8',
    foreground: '#2C2825',
    accent:     '#B8602A',
    muted:      '#8A837A',
    line:       '#D4CFC7',
  }),
})

const MIDNIGHT_INDIGO = Object.freeze({
  id: 'system-midnight-indigo',
  name: 'Midnight Indigo',
  description: 'Indigo notturno con accento viola elettrico. Premium colto, alternativa al tech-dark verde — bene per cultura, musica, design.',
  origin: 'system',
  colors: Object.freeze({
    background: '#0E1430',
    surface:    '#1B2348',
    foreground: '#EDEAF7',
    accent:     '#9D7BFF',
    muted:      'rgba(237,234,247,0.45)',
    line:       'rgba(237,234,247,0.18)',
  }),
})

const MOCHA_GOLD = Object.freeze({
  id: 'system-mocha-gold',
  name: 'Mocha Gold',
  description: 'Marrone scuro caldo con accento ocra-oro. Dark mode alternativo, ricco e serale — pensato per food, lifestyle premium.',
  origin: 'system',
  colors: Object.freeze({
    background: '#1F1611',
    surface:    '#2E241D',
    foreground: '#F4EBD9',
    accent:     '#D4A85C',
    muted:      'rgba(244,235,217,0.45)',
    line:       'rgba(244,235,217,0.18)',
  }),
})

const CLOUD_COBALT = Object.freeze({
  id: 'system-cloud-cobalt',
  name: 'Cloud Cobalt',
  description: 'Crema Cloud Dancer (Pantone 2026) con accento cobalto saturo. Tipografico e pulito — pensato per B2B, fintech, editoria tech.',
  origin: 'system',
  colors: Object.freeze({
    background: '#F4F0E8',
    surface:    '#E5DFD2',
    foreground: '#0F172A',
    accent:     '#2547D0',
    muted:      '#6A6F7A',
    line:       '#CCC6B7',
  }),
})

export const BUILTIN_PALETTES = Object.freeze([
  TECH_DARK,
  WARM_NEUTRAL,
  MIDNIGHT_INDIGO,
  MOCHA_GOLD,
  CLOUD_COBALT,
])

// Map interna per lookup O(1) — non esposta direttamente
const _builtinMap = new Map(BUILTIN_PALETTES.map((p) => [p.id, p]))

/**
 * Ritorna la palette built-in con quel id, o undefined.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getBuiltinPalette(id) {
  return _builtinMap.get(id)
}

/**
 * Controlla se un id corrisponde a una palette built-in.
 * @param {string} id
 * @returns {boolean}
 */
export function isBuiltinId(id) {
  return _builtinMap.has(id)
}
