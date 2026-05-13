/**
 * Migrazione retrocompatibile per il formato del carosello.
 *
 * Gestisce i casi palette (A-D) e il caso template:
 *   A: palette 5 colori, nessun palette_id → inferisce surface, tenta match built-in
 *   B: palette 6 colori, nessun palette_id → tenta match built-in
 *   C: palette_id presente e valido → no-op
 *   D: palette_id presente ma non trovato → lascia invariato (la UI mostrerà stato custom)
 *   T: template_id assente → inietta 'system-editorial-mark' (unico template storico)
 *
 * IMPORTANTE:
 * - Pura: non ha side effect, non accede a localStorage
 * - Idempotente: migrateCarousel(migrateCarousel(x)) === migrateCarousel(x)
 * - Tollerante: se l'input è malformato, lo restituisce invariato (sarà Zod a urlare)
 * - NON viene chiamata su tutti i draft all'avvio — solo sul carosello corrente durante il caricamento
 */
import { inferSurface } from '../palettes/colorUtils.js'
import { matchBuiltin } from '../palettes/matchBuiltin.js'
import { getBuiltinPalette } from '../palettes/builtinPalettes.js'

const DEFAULT_TEMPLATE_ID = 'system-editorial-mark'

/**
 * Migra l'oggetto theme al formato corrente.
 * @param {object} theme
 * @returns {object}
 */
function migrateTheme(theme) {
  if (!theme || typeof theme !== 'object') return theme

  const palette = theme.palette
  if (!palette || typeof palette !== 'object') return theme

  // Distinguiamo "chiave assente" (vecchio JSON) da "chiave presente a null" (custom esplicito).
  // Un JSON.parse su vecchio formato: theme.palette_id === undefined
  // Un JSON.parse su nuovo formato custom: theme.palette_id === null
  const hasPaletteId  = 'palette_id' in theme
  const hasTemplateId = 'template_id' in theme
  const hasSurface    = 'surface' in palette && palette.surface != null

  // ── Caso T: template_id assente → era un carosello pre-templates ──────────
  // Tutti i caroselli storici usavano il solo template Editorial Mark.
  const withTemplateId = hasTemplateId ? theme : { ...theme, template_id: DEFAULT_TEMPLATE_ID }

  // ── Caso A: 5 colori, nessun palette_id ──────────────────────────────────
  if (!hasSurface && !hasPaletteId) {
    const surface    = inferSurface(palette.background)
    const newPalette = { ...palette, surface }
    const matched    = matchBuiltin(newPalette)
    return { ...withTemplateId, palette: newPalette, palette_id: matched }
  }

  // ── Caso B: 6 colori, nessun palette_id ──────────────────────────────────
  if (hasSurface && !hasPaletteId) {
    const matched = matchBuiltin(palette)
    return { ...withTemplateId, palette_id: matched }
  }

  // ── Casi C e D: palette_id presente ──────────────────────────────────────
  // Se manca surface ma il palette_id punta a una built-in valida,
  // ripristiniamo i colori completi dalla built-in.
  if (hasPaletteId && theme.palette_id && !hasSurface) {
    const builtin = getBuiltinPalette(theme.palette_id)
    if (builtin) {
      return { ...withTemplateId, palette: { ...builtin.colors }, palette_id: theme.palette_id }
    }
  }

  // Caso C (palette_id valido, palette completa) → solo template_id se mancante
  // Caso D (palette_id sconosciuto, palette completa) → idem, la UI gestisce il dangling
  return withTemplateId
}

/**
 * Migra un oggetto carosello raw al formato corrente dello schema.
 * Va chiamata SUBITO dopo JSON.parse e PRIMA della validazione Zod.
 *
 * @param {*} raw — qualsiasi valore (può essere null, undefined, non-oggetto)
 * @returns {*} — il carosello migrato, o l'input invariato se non migrabile
 */
export function migrateCarousel(raw) {
  if (!raw || typeof raw !== 'object') return raw

  try {
    return {
      ...raw,
      theme: migrateTheme(raw.theme),
    }
  } catch {
    // Non crashare mai — Zod produrrà l'errore appropriato
    return raw
  }
}
